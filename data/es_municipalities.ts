
export interface Municipality {
  provinceCode: string;
  provinceName: string;
  municipalityCode: string;
  municipalityName: string;
}

export const MUNICIPALITIES: Municipality[] = [
  // Alicante (03)
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "014", municipalityName: "Alicante/Alacant" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "023", municipalityName: "Biar" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "032", municipalityName: "Benidorm" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "063", municipalityName: "Elche/Elx" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "133", municipalityName: "Torrevieja" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "018", municipalityName: "Altea" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "053", municipalityName: "Cocentaina" },


  // Murcia (30)
  { provinceCode: "30", provinceName: "Murcia", municipalityCode: "016", municipalityName: "Cartagena" },
  { provinceCode: "30", provinceName: "Murcia", municipalityCode: "024", municipalityName: "Jumilla" },
  { provinceCode: "30", provinceName: "Murcia", municipalityCode: "025", municipalityName: "Lorca" },
  { provinceCode: "30", provinceName: "Murcia", municipalityCode: "030", municipalityName: "Murcia" },
  { provinceCode: "30", provinceName: "Murcia", municipalityCode: "043", municipalityName: "Yecla" },

  // Valencia (46)
  { provinceCode: "46", provinceName: "Valencia", municipalityCode: "250", municipalityName: "Valencia" },
  { provinceCode: "46", provinceName: "Valencia", municipalityCode: "135", municipalityName: "Gandia" },
  { provinceCode: "46", provinceName: "Valencia", municipalityCode: "220", municipalityName: "Sagunto/Sagunt" },
  { provinceCode: "46", provinceName: "Valencia", municipalityCode: "244", municipalityName: "Torrent" },
  { provinceCode: "46", provinceName: "Valencia", municipalityCode: "186", municipalityName: "Oliva" },

  // Madrid (28)
  { provinceCode: "28", provinceName: "Madrid", municipalityCode: "079", municipalityName: "Madrid" },
  { provinceCode: "28", provinceName: "Madrid", municipalityCode: "005", municipalityName: "Alcalá de Henares" },
  { provinceCode: "28", provinceName: "Madrid", municipalityCode: "049", municipalityName: "Getafe" },
  { provinceCode: "28", provinceName: "Madrid", municipalityCode: "082", municipalityName: "Móstoles" },
  
  // Jaén (23)
  { provinceCode: "23", provinceName: "Jaén", municipalityCode: "050", municipalityName: "Jaén" },
  { provinceCode: "23", provinceName: "Jaén", municipalityCode: "092", municipalityName: "Úbeda" },
  { provinceCode: "23", provinceName: "Jaén", municipalityCode: "055", municipalityName: "Linares" },
  { provinceCode: "23", provinceName: "Jaén", municipalityCode: "005", municipalityName: "Andújar" }
];

// Create a unique list of provinces for the dropdown
export const PROVINCES = [...new Map(MUNICIPALITIES.map(item => [item.provinceName, item])).values()]
    .map(p => ({ code: p.provinceCode, name: p.provinceName }))
    .sort((a,b) => a.name.localeCompare(b.name));