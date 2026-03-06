const CATASTRO_HOST = "https://ovc.catastro.meh.es";

/**
 * Henter en Catastro-URL via:
 *  1. Vite dev-proxy  (/api/catastro/...)  – fungerer under `npm run dev`
 *  2. allorigins.win  – fungerer i produksjon
 *  3. corsproxy.io    – reservefallback
 * Kaster en lesbar feil om alle alternativer svikter.
 */
const catastroFetch = async (url: string): Promise<string> => {
  const path = url.replace(CATASTRO_HOST, "");

  // 1) Vite dev-proxy
  try {
    const r = await fetch(`/api/catastro${path}`);
    if (r.ok) {
      const text = await r.text();
      if (text.trim().startsWith("<")) return text;
    }
  } catch (_) { /* ikke i dev-modus */ }

  // 2) allorigins.win
  try {
    const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
    if (r.ok) {
      const text = await r.text();
      if (text.trim().startsWith("<")) return text;
      throw new Error(`Ugyldig svar fra allorigins: ${text.slice(0, 120)}`);
    }
    throw new Error(`allorigins HTTP ${r.status}`);
  } catch (e: any) {
    if (!e.message?.startsWith("allorigins") && !e.message?.startsWith("Ugyldig")) throw e;
    console.warn("[catastroFetch] allorigins feilet:", e.message);
  }

  // 3) corsproxy.io
  const r3 = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
  if (!r3.ok) throw new Error(`Catastro-proxy feilet (HTTP ${r3.status}). Prøv igjen.`);
  const text3 = await r3.text();
  if (!text3.trim().startsWith("<"))
    throw new Error(`Uventet svar fra proxy: ${text3.slice(0, 120)}`);
  return text3;
};

export class SedecService {
  private static WFS_URL =
    "https://ovc.catastro.meh.es/ovcservweb/ovcwfs/ServidorWFS.aspx";
  private static ALPHA_CODES_URL =
    `${CATASTRO_HOST}/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/Consulta_DNPPP_Codigos`;

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
      if (!r.ok) throw new Error(`WFS HTTP ${r.status}`);
      const xml = await r.text();
      const coords = this.parseGmlPolygon(xml);
      if (coords && coords.length > 2) return coords;
      throw new Error("Ingen koordinater i WFS-svar");
    } catch (e) {
      console.warn("[getParcelPolygon]", e);
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

  async getAlphanumericDataByCode(
    provinciaCod: string, municipioCod: string,
    poligono: string, parcela: string
  ): Promise<any> {
    const params = new URLSearchParams({
      CodigoProvincia: provinciaCod,
      CodigoMunicipio: municipioCod,
      Poligono: poligono,
      Parcela: parcela,
    });
    const url = `${SedecService.ALPHA_CODES_URL}?${params}`;
    const xmlText = await catastroFetch(url);
    console.log("[Catastro XML]", xmlText.slice(0, 600));

    if (xmlText.includes("<err>") || xmlText.includes("<faultstring>")) {
      const m = xmlText.match(/<des>(.*?)<\/des>/i)
               || xmlText.match(/<faultstring>(.*?)<\/faultstring>/i);
      throw new Error(`Catastro: ${m?.[1] || "feil fra API"}`);
    }

    const data = this.parseAlphanumericXml(xmlText);
    if (!data.cadastralId)
      throw new Error("Fant ikke Referencia Catastral i svaret. Sjekk Polígono/Parcela.");
    return data;
  }

  private parseAlphanumericXml(xml: string): any {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    const result: any = {};

    const pc1 = xmlDoc.querySelector("pc1")?.textContent?.trim() ?? "";
    const pc2 = xmlDoc.querySelector("pc2")?.textContent?.trim() ?? "";
    const id = pc1 + pc2;
    if (id.length >= 14) result.cadastralId = id;

    const sfe = xmlDoc.querySelector("sfe");
    if (sfe?.textContent) result.areaSqm = parseInt(sfe.textContent.trim(), 10) || 0;

    result.landUse = xmlDoc.querySelector("luso")?.textContent?.trim() || "Ukjent";
    result.address  = xmlDoc.querySelector("ldt")?.textContent?.trim()  || "Ingen adresse";

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
