# Table Olive Recipe Library

This library keeps exactly 50 curated table-olive recipes in `olivia.recipes` using stable IDs `default-r1` through `default-r50`.

## Production Model

- Recipes are normalized per 1 liter of finishing brine or marinade.
- They assume olives have already been correctly debittered/cured before flavor marination unless a note says otherwise.
- Each recipe includes instructions in `notes`, suggested olive varieties, ready days, sensory profile, and a practical balance cue.
- The AI chef prompt now treats chili, garlic, salt, acid, oil, sweetness, bitterness and umami as one system. If heat is increased, it should also consider extra acid/freshness, oil, herbs, and a small amount of sweetness when useful.

## Source Patterns

- [International Olive Council](https://www.internationaloliveoil.org/olive-world/table-olives/): table olives need oleuropein removal through lye, brine or water treatments; Spanish-style fermentation commonly starts with higher brine and then stabilizes with salt and lower pH.
- [UC ANR, Olives: Safe Methods for Home Pickling](https://my.ucanr.edu/repository/fileaccess.cfm?article=54319&p=+IWWAOQ): home-pickled olives require careful handling; low-acid improperly canned olives can be a botulism risk, so these recipes are finishing marinades and not shelf-stable canning instructions.
- Spanish market patterns: [Campo Real](https://www.aceitunasbernabe.com/producto/aceitunas-de-campo-real/), [Campo Real aliño](https://www.aceitunasuceda.com/aceitunas-de-campo-real-ii-ingredientes-del-alino/), [Aloreña DOP](https://www.juntadeandalucia.es/sites/default/files/inline-files/2023/08/DU_Aceituna_Alore%C3%B1a_modificado_3.pdf), [Cacereña aliñada](https://xn--aceitunasdeespaa-lub.es/recetas/aceitunas-cacerena-alinadas-en-vinagre-de-manzana-escamas-de-pimenton-oregano-y-pimienta/).
- Mediterranean patterns: [Cyprus tsakistes](https://cypruspassion.net/elies-tsakistes-coriander-crushed-olives-recipe/), [Moroccan preserved lemon and harissa](https://www.tabletmag.com/recipes/moroccan-marinated-olives), [Turkish pomegranate molasses olives](https://www.ceren.com.tr/turkish-spicy-olive-meze-with-pomegranate-molasses/), [zaatar/sumac](https://www.linsfood.com/zaatar/), and citrus-fennel/herb olive profiles such as [BBC Good Food](https://www.bbcgoodfood.com/recipes/citrus-fennel-marinated-olives).

## Sync

Run:

```bash
npm run sync:recipes
```

The script reads `.env.local`, targets `VITE_OLIVIA_SUPABASE_SCHEMA` (default `olivia`), and upserts the 50 stable recipe IDs.
