
// Hjelpefunksjon: prøv direktefetch, fall tilbake på allorigins-proxy om CORS blokkerer
const catastroFetch = async (url: string): Promise<string> => {
  // 1) Direkte (fungerer i server-side / Electron / noen nettlesere uten CORS-blokk)
  try {
    const r = await fetch(url);
    if (r.ok) {
      const text = await r.text();
      // Sanity-sjekk: XML-svar inneholder alltid <?xml eller <
      if (text.trim().startsWith("<")) return text;
    }
  } catch (_) { /* CORS-feil — prøv proxy */ }

  // 2) allorigins.win – returnerer råinnholdet uten CORS-restriksjon
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const r2 = await fetch(proxyUrl);
  if (!r2.ok) throw new Error(`Proxy HTTP ${r2.status}`);
  return r2.text();
};

export class SedecService {
  private static WFS_URL =
    "https://ovc.catastro.minhafp.es/ovcservweb/ovcwfs/ServidorWFS.aspx";
  private static ALPHA_URL =
    "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPPP";
  private static ALPHA_CODES_URL =
    "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/Consulta_DNPPP_Codigos";

  async getParcelPolygon(
    refCat: string,
    fallbackCoords?: [number, number]
  ): Promise<[number, number][] | null> {
    try {
      const parcelId = refCat.replace(/\s/g, "").slice(0, 14);
      const params = new URLSearchParams({
        SERVICE: "WFS", VERSION: "1.1.0", REQUEST: "GetFeature",
        TYPENAME: "CP:CadastralParcel",
        FEATUREID: `CP.CadastralParcel.${parcelId}`,
        SRSNAME: "EPSG:4326",
      });
      const r = await fetch(`${SedecService.WFS_URL}?${params}`);
      if (!r.ok) throw new Error("WFS error");
      const xml = await r.text();
      const coords = this.parseGmlPolygon(xml);
      if (coords && coords.length > 2) return coords;
      throw new Error("No coords");
    } catch (e) {
      console.warn("WFS polygon failed:", e);
      if (fallbackCoords) {
        const o = 0.0003, [lat, lon] = fallbackCoords;
        return [
          [lat + o, lon - o], [lat + o, lon + o],
          [lat - o, lon + o], [lat - o, lon - o],
          [lat + o, lon - o],
        ];
      }
      return null;
    }
  }

  async getAlphanumericData(
    provincia: string, municipio: string,
    poligono: string, parcela: string
  ): Promise<any | null> {
    const params = new URLSearchParams({ Provincia: provincia, Municipio: municipio, Poligono: poligono, Parcela: parcela });
    return this._fetchAndParse(`${SedecService.ALPHA_URL}?${params}`);
  }

  async getAlphanumericDataByCode(
    provinciaCod: string, municipioCod: string,
    poligono: string, parcela: string
  ): Promise<any | null> {
    const params = new URLSearchParams({
      CodigoProvincia: provinciaCod,
      CodigoMunicipio: municipioCod,
      Poligono: poligono,
      Parcela: parcela,
    });
    return this._fetchAndParse(`${SedecService.ALPHA_CODES_URL}?${params}`);
  }

  private async _fetchAndParse(url: string): Promise<any | null> {
    try {
      const xmlText = await catastroFetch(url);
      console.log("[Catastro XML preview]", xmlText.slice(0, 500));

      // Sjekk om API returnerte en feilmelding
      if (xmlText.includes("<err>") || xmlText.includes("<faultstring>")) {
        const errMatch = xmlText.match(/<des>(.*?)<\/des>/i) || xmlText.match(/<faultstring>(.*?)<\/faultstring>/i);
        throw new Error(`Catastro API-feil: ${errMatch?.[1] || "ukjent"}`);
      }

      const data = this.parseAlphanumericXml(xmlText);
      if (!data.cadastralId) throw new Error("Fant ikke Referencia Catastral i svaret.");
      return data;
    } catch (error) {
      console.error("Catastro fetch/parse failed:", error);
      return null;
    }
  }

  private parseAlphanumericXml(xml: string): any {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    const result: any = {};

    // Referencia Catastral
    const allPc1 = xmlDoc.querySelectorAll("pc1");
    const allPc2 = xmlDoc.querySelectorAll("pc2");
    if (allPc1.length > 0 && allPc2.length > 0) {
      const id = (allPc1[0].textContent || "").trim() + (allPc2[0].textContent || "").trim();
      if (id.length >= 14) result.cadastralId = id;
    }

    // Areal i m²
    const sfe = xmlDoc.querySelector("sfe");
    if (sfe?.textContent) result.areaSqm = parseInt(sfe.textContent.trim(), 10) || 0;

    // Bruksklasse
    result.landUse = xmlDoc.querySelector("luso")?.textContent?.trim() || "Ukjent";

    // Adresse
    result.address = xmlDoc.querySelector("ldt")?.textContent?.trim() || "Ingen adresse";

    return result;
  }

  private parseGmlPolygon(xml: string): [number, number][] | null {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, "text/xml");
      const posListEl = xmlDoc.getElementsByTagNameNS("*", "posList")[0];
      if (!posListEl?.textContent) return null;
      const values = posListEl.textContent.trim().split(/\s+/).map(Number);
      const coords: [number, number][] = [];
      for (let i = 0; i + 1 < values.length; i += 2) {
        if (!isNaN(values[i]) && !isNaN(values[i + 1]))
          coords.push([values[i], values[i + 1]]);
      }
      return coords.length > 2 ? coords : null;
    } catch { return null; }
  }
}

export const sedecService = new SedecService();
