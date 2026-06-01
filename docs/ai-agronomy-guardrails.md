# AI Agronomy Guardrails

Olivia can help triage olive-tree images, but it must not pretend that image-only analysis is a cultivar certificate or an exact age assessment.

## Rules In The App

- Cultivar identification returns `Ukjent sort` when the image lacks enough evidence.
- Low-confidence cultivar candidates are rewritten as unknown with a visible low-confidence note.
- Tree age is a broad class, not an exact year count, unless trunk and context support it.
- Pruning steps are only returned for visible branches and may be zero when the image is insufficient.
- Major pruning in Biar/Alicante is steered toward post-harvest winter or late winter. Summer recommendations are limited to dry wood, suckers, water shoots, or small corrections unless a human confirms more.
- Fertilizer, irrigation and yield estimates must say when they need soil/leaf analysis, moisture sensors, ET0, harvest history or field inspection.

## Field Evidence Required

- Whole tree photo with trunk base and main scaffold branches.
- Close-up of leaf upper side and underside.
- Fruit and stone photo if cultivar is being assessed.
- Parcel history or known planting records.
- Soil/leaf analysis for nutrition decisions.
- Moisture/ET0/weather data for irrigation decisions.

## Reference Basis

- [Junta de Andalucía RAIF, bases agronómicas de la poda del olivo](https://www.juntadeandalucia.es/agriculturapescaaguaydesarrollorural/raif/bases-agronomicas-de-la-poda-del-olivo/)
- [IFAPA, decálogo de poda del olivar moderno](https://www.juntadeandalucia.es/agriculturaypesca/ifapa/servifapa/registro-servifapa/0647a8d9-04c6-4284-8fb6-848d7283dabb/download)
- [IFAPA, poda de producción](https://www.juntadeandalucia.es/agriculturaypesca/ifapa/servifapa/index.php/registro-servifapa/0e496cd1-2448-4898-a1c7-998a71d87a6e/download)
- [The Olive Oil Source, olive tree pruning](https://www.oliveoilsource.com/info/olive-tree-pruning)
- [International Olive Council, World Catalogue of Olive Varieties](https://worldolivecatalogue.internationaloliveoil.org/en/variety/spain/gordal-sevillana)
- [CPVO Olea europaea technical protocol](https://cpvo.europa.eu/sites/default/files/documents/olea_europaea_1.pdf)
- [OliVaR research note on cultivar recognition limits](https://arxiv.org/abs/2303.00431)
