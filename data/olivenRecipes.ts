import { Recipe } from '../types';
import { TABLE_OLIVE_RECIPES } from './tableOliveRecipes.js';

type RecipeData = Omit<Recipe, 'id'>;

const data = TABLE_OLIVE_RECIPES as RecipeData[];

export const DEFAULT_RECIPES: Recipe[] = data.map((r, i) => ({
  ...r,
  id: `default-r${i + 1}`,
}));

export const FLAVOR_PROFILE_LABELS: Record<string, string> = {
  mild: 'Mild',
  syrlig: 'Syrlig',
  krydret: 'Krydret',
  urterik: 'Urterik',
  sitrus: 'Sitrus',
  hvitlok: 'Hvitløk',
  middelhav: 'Middelhav',
};

export const FLAVOR_PROFILE_COLORS: Record<string, string> = {
  mild: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  syrlig: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  krydret: 'bg-red-500/20 text-red-300 border-red-500/30',
  urterik: 'bg-green-500/20 text-green-300 border-green-500/30',
  sitrus: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  hvitlok: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  middelhav: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

export const OLIVE_TYPES = [
  'Gordal Sevillana', 'Manzanilla', 'Manzanilla Cacereña', 'Aloreña',
  'Hojiblanca', 'Picual', 'Arbequina', 'Empeltre', 'Verdial', 'Cacereña',
  'Blanqueta', 'Verdeja', 'Kalamata', 'Halkidiki', 'Thassos', 'Koroneiki',
  'Nocellara del Belice', 'Taggiasca', 'Leccino', 'Frantoio', 'Carolea',
  'Cerignola', 'Picholine', 'Lucques', 'Salonenque', 'Chemlali', 'Meski',
  'Beldi', 'Souri', 'Gemlik', 'Ayvalik', 'Annen sort',
];
