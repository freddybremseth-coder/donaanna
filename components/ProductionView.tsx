
import React, { useState, useEffect } from 'react';
import {
  Plus, Sprout, X, Layers, Star, Edit3, Wand2,
  Sparkles, ChefHat, Save, AlertCircle,
  PlusCircle, MinusCircle, Clock, BookOpen,
  Droplets, Thermometer, FlaskConical, Scale,
  Loader2, Trash2, CheckCircle2, ShoppingCart,
  ChevronRight, Search, Bell, Archive, RefreshCcw,
  ClipboardList, MapPin, Award, Timer, Filter
} from 'lucide-react';
import { Batch, Parcel, Recipe, Ingredient, TableOliveStage, Language } from '../types';
import { geminiService } from '../services/geminiService';
import { useTranslation } from '../services/i18nService';
import {
  DEFAULT_RECIPES, FLAVOR_PROFILE_LABELS, FLAVOR_PROFILE_COLORS, OLIVE_TYPES
} from '../data/olivenRecipes';

type FlavorFilter = 'all' | 'mild' | 'syrlig' | 'krydret' | 'urterik' | 'sitrus' | 'hvitlok' | 'middelhav';
type MainTab = 'pipeline' | 'active' | 'history' | 'recipes' | 'guide';

const STAGES: TableOliveStage[] = ['PLUKKING', 'LAKE', 'SKYLLING', 'MARINERING', 'LAGRING', 'PAKKING', 'SALG'];

interface ProductionViewProps {
  language: Language;
  parcels: Parcel[];
}

const ProductionView: React.FC<ProductionViewProps> = ({ language, parcels }) => {
  const { t } = useTranslation(language);

  const STAGE_LABELS: Record<TableOliveStage, string> = {
    PLUKKING: t('picking'),
    LAKE: t('brine'),
    SKYLLING: t('rinsing'),
    MARINERING: t('marinating'),
    LAGRING: t('storage'),
    PAKKING: t('packaging'),
    SALG: t('sale'),
  };
  
  const [batches, setBatches] = useState<Batch[]>([
    {
      id: 'B001',
      parcelId: 'p1',
      recipeId: 'R001',
      yieldType: 'Table',
      quality: 'Premium',
      weight: 150,
      harvestDate: '2023-10-28',
      currentStage: 'MARINERING',
      status: 'ACTIVE',
      logs: [{ stage: 'PLUKKING', startDate: '2023-10-28', notes: 'Håndplukket ved optimal modenhet.' }, { stage: 'LAKE', startDate: '2023-10-29', notes: 'Lake med 8% salt.' }],
      qualityMetrics: { acidity: 0.2, peroxide: 4, k232: 1.8, k270: 0.15, deltaK: 0.005, phenols: 550 },
    },
    {
      id: 'B002',
      parcelId: 'p2',
      recipeId: 'R003',
      yieldType: 'Table',
      quality: 'Good',
      weight: 320,
      harvestDate: '2023-11-05',
      currentStage: 'LAKE',
      status: 'ACTIVE',
      logs: [{ stage: 'PLUKKING', startDate: '2023-11-05', notes: 'Maskinell høsting.' }],
    }
  ]);
  const [recipes, setRecipes] = useState<Recipe[]>(DEFAULT_RECIPES);
  const [mainTab, setMainTab] = useState<MainTab>('pipeline');
  const [flavorFilter, setFlavorFilter] = useState<FlavorFilter>('all');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [newBatch, setNewBatch] = useState<Partial<Batch>>({
    yieldType: 'Table', quality: 'Premium', status: 'ACTIVE', weight: 0,
    harvestDate: new Date().toISOString().split('T')[0], currentStage: 'PLUKKING',
  });

  const handleOpenRecipeModal = (recipe: Recipe | null = null) => {
    if (recipe) {
      setEditingRecipe(JSON.parse(JSON.stringify(recipe))); // Deep copy to avoid state mutation issues
    } else {
      setEditingRecipe({ name: '', description: '', flavorProfile: 'mild', ingredients: [], instructions: '', isAiGenerated: false });
    }
    setIsRecipeModalOpen(true);
  };
  
  const handleSaveRecipe = () => {
    if (!editingRecipe || !editingRecipe.name) return;

    if (editingRecipe.id) { // Update existing recipe
      setRecipes(recipes.map(r => r.id === editingRecipe!.id ? editingRecipe as Recipe : r));
    } else { // Create new recipe
      const newRecipe: Recipe = {
        id: `R${Date.now()}`,
        ...editingRecipe,
      } as Recipe;
      setRecipes([...recipes, newRecipe]);
    }
    setIsRecipeModalOpen(false);
    setEditingRecipe(null);
  };

  const handleCreateBatch = () => {
    if (!newBatch.parcelId || !newBatch.weight || newBatch.weight <= 0) {
      alert(t('please_select_parcel_and_weight'));
      return;
    }
    const batch: Batch = {
      id: `B${Date.now()}`,
      parcelId: newBatch.parcelId,
      yieldType: newBatch.yieldType || 'Table',
      quality: newBatch.quality || 'Standard',
      weight: newBatch.weight,
      harvestDate: newBatch.harvestDate || new Date().toISOString().split('T')[0],
      currentStage: 'PLUKKING',
      status: 'ACTIVE',
      logs: [{ stage: 'PLUKKING', startDate: new Date().toISOString().split('T')[0], notes: 'Batch opprettet.' }]
    };
    setBatches([...batches, batch]);
    setIsBatchModalOpen(false);
    setNewBatch({ yieldType: 'Table', quality: 'Premium', status: 'ACTIVE', weight: 0, harvestDate: new Date().toISOString().split('T')[0], currentStage: 'PLUKKING' });
  };

  const handleAdvanceStage = (batchId: string) => {
    setBatches(batches.map(b => {
      if (b.id === batchId) {
        const currentIndex = STAGES.indexOf(b.currentStage);
        if (currentIndex < STAGES.length - 1) {
          const nextStage = STAGES[currentIndex + 1];
          return { 
            ...b, 
            currentStage: nextStage,
            logs: [...(b.logs || []), { stage: nextStage, startDate: new Date().toISOString().split('T')[0], notes: '' }]
          };
        } else { // Last stage, archive it
          return { ...b, status: 'ARCHIVED' };
        }
      }
      return b;
    }));
  };
  
  const handleAiAdjust = async () => {
    if (!aiPrompt || !editingRecipe) return;
    setIsAiLoading(true);
    try {
      const adjusted = await geminiService.adjustRecipe(editingRecipe || {}, aiPrompt, language);
      setEditingRecipe(prev => ({ ...prev, ...adjusted, isAiGenerated: true }));
      setAiPrompt('');
    } catch (err) {
      alert(t('ai_chef_error') + (err instanceof Error ? ` ${err.message}`: ''));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDeleteRecipe = (id: string) => {
    if (confirm(t('delete_recipe_confirm'))) {
        setRecipes(recipes.filter(r => r.id !== id));
    }
  };

  const activeBatches = batches.filter(b => b.status === 'ACTIVE');
  const archivedBatches = batches.filter(b => b.status === 'ARCHIVED');
  const filteredRecipes = recipes.filter(r => {
    const matchesProfile = flavorFilter === 'all' || r.flavorProfile === flavorFilter;
    const matchesSearch = !recipeSearch || r.name.toLowerCase().includes(recipeSearch.toLowerCase());
    return matchesProfile && matchesSearch;
  });
  const batchesInStage = (stage: TableOliveStage) => activeBatches.filter(b => b.currentStage === stage);

  const getParcelName = (parcelId: string) => parcels.find(p => p.id === parcelId)?.name || 'Ukjent Lunn';

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Layers className="text-green-400" /> {t('production_control')}
          </h2>
          <p className="text-slate-400 text-sm">{t('table_olive_pipeline')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleOpenRecipeModal()} className="bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"><ChefHat size={18} /> {t('new_recipe')}</button>
          <button onClick={() => setIsBatchModalOpen(true)} className="bg-green-500/20 text-green-300 hover:bg-green-500/30 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"><Plus size={18} /> {t('new_batch')}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-0 overflow-x-auto">
        {([
          { id: 'pipeline', label: t('pipeline'), icon: <Layers size={14} />, count: activeBatches.length },
          { id: 'active', label: t('active_batches'), icon: <ClipboardList size={14} />, count: activeBatches.length },
          { id: 'history', label: t('history'), icon: <Archive size={14} />, count: archivedBatches.length },
          { id: 'recipes', label: t('recipes'), icon: <ChefHat size={14} />, count: recipes.length },
          { id: 'guide', label: t('process_guide'), icon: <BookOpen size={14} /> },
        ] as const).map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setMainTab(tab.id as MainTab)} 
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${mainTab === tab.id ? 'border-green-400 text-green-400' : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'}`}>
            {tab.icon} {tab.label}
            {tab.count !== undefined && <span className={`text-xs rounded-full px-2 py-0.5 ${mainTab === tab.id ? 'bg-green-400/20 text-green-300' : 'bg-slate-700 text-slate-300'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {mainTab === 'pipeline' && (
        activeBatches.length === 0 ? (
            <div className="text-center py-20 px-4 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700" dangerouslySetInnerHTML={{ __html: t('no_active_batches') }} />
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {STAGES.map(stage => {
                const stageBatches = batchesInStage(stage);
                return (
                  <div key={stage} className="w-72 flex-shrink-0 bg-slate-900/50 rounded-xl p-3 border border-slate-800">
                    <h3 className="font-bold text-slate-300 tracking-wide flex items-center justify-between">{STAGE_LABELS[stage]} <span className="text-sm font-normal bg-slate-700 text-slate-300 rounded-full h-6 w-6 inline-flex items-center justify-center">{stageBatches.length}</span></h3>
                    <div className="space-y-3 mt-4 h-[60vh] overflow-y-auto pr-1">
                        {stageBatches.map(batch => {
                            const nextStage = STAGES[STAGES.indexOf(batch.currentStage) + 1];
                            return (
                                <div key={batch.id} className="glass p-3 rounded-lg border-l-4 border-green-500/50">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-sm text-white">{batch.id} - {batch.weight} kg</p>
                                        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">{batch.quality}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin size={12}/> {getParcelName(batch.parcelId)}</p>
                                    <button onClick={() => handleAdvanceStage(batch.id)} className="text-xs mt-3 w-full bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded-md flex items-center justify-center gap-1 transition-all">
                                      {nextStage ? <>{t('advance_to')} {STAGE_LABELS[nextStage]} <ChevronRight size={14} /></> : <><CheckCircle2 size={14} /> {t('archive')}</>}
                                    </button>
                                </div>
                            )
                        })}
                        {stageBatches.length === 0 && <div className="text-center text-xs text-slate-500 pt-10">{t('no_batches_in_stage')}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
      {/* Add other tab views here... */}

    </div>
  );
};

export default ProductionView;
