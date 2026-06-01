import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { TABLE_OLIVE_RECIPES } from '../data/tableOliveRecipes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv(filename) {
  const file = path.join(root, filename);
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        return [key, value];
      }),
  );
}

const env = {
  ...loadEnv('.env'),
  ...loadEnv('.env.local'),
  ...process.env,
};

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const schema = env.VITE_OLIVIA_SUPABASE_SCHEMA || 'olivia';

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY.');
}

const supabase = createClient(url, key, { db: { schema } });

const rows = TABLE_OLIVE_RECIPES.map((recipe, index) => ({
  id: `default-r${index + 1}`,
  name: recipe.name,
  flavor_profile: recipe.flavorProfile ?? null,
  description: recipe.description ?? null,
  recommended_olive_types: recipe.recommendedOliveTypes ?? null,
  ingredients: recipe.ingredients ?? [],
  brine_change_days: recipe.brineChangeDays ?? null,
  marinade_day_from: recipe.marinadeDayFrom ?? null,
  ready_after_days: recipe.readyAfterDays ?? null,
  rating: recipe.rating ?? 4,
  notes: recipe.notes ?? '',
  is_ai_generated: recipe.isAiGenerated ?? false,
  is_quality_assured: recipe.isQualityAssured ?? true,
  updated_at: new Date().toISOString(),
}));

const { error } = await supabase
  .from('recipes')
  .upsert(rows, { onConflict: 'id' });

if (error) throw error;

const { data, error: readError, count } = await supabase
  .from('recipes')
  .select('id,name,flavor_profile', { count: 'exact' })
  .order('id', { ascending: true });

if (readError) throw readError;

console.log(`Synced ${rows.length} curated table-olive recipes into ${schema}.recipes. Total rows: ${count}.`);
console.table((data ?? []).slice(0, 8));
