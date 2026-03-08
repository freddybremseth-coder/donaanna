
import { PruningPlan, PlantDiagnosis } from './services/geminiService';

export type Language = 'en' | 'no' | 'es';

export interface FarmInsight {
    id: string;
    tittel: string;
    beskrivelse: string;
}

export enum EquipmentStatus {
  ACTIVE = 'ACTIVE',
  SERVICE = 'SERVICE',
  BROKEN = 'BROKEN'
}

export type UserRole = 'farmer' | 'super_admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subscription: 'monthly' | 'annual' | 'lifetime' | 'trial';
  subscriptionStart: string;
  avatar?: string;
}

export type TableOliveStage = 'PLUKKING' | 'LAKE' | 'SKYLLING' | 'MARINERING' | 'LAGRING' | 'PAKKING' | 'SALG';

export type FlavorProfile = 'mild' | 'syrlig' | 'krydret' | 'urterik' | 'sitrus' | 'hvitlok' | 'middelhav';

export interface AppDocument {
  id: string;
  name: string;
  type: 'Nota Simple' | 'Skjøte' | 'Tillatelse' | 'Annet';
  uploadDate: string;
  fileSize: string;
  url: string; 
  parcelId?: string; 
}

export interface Parcel {
  id: string;
  name: string;
  municipality?: string;
  cadastralId?: string;
  cropType?: string;
  crop?: string;
  treeVariety?: string;
  area: number;
  treeCount?: number;
  irrigationStatus?: 'Optimal' | 'Low' | 'Critical';
  coordinates?: [number, number][];
  lat?: number;
  lon?: number;
  soilType?: string;
  registrationDate?: string;
  boundaries?: any[];
  documentIds?: string[];
  registryDetails?: string;
}

export interface ComprehensiveAnalysis {
  diagnosis: PlantDiagnosis;
  pruning: PruningPlan;
  varietyConfidence: number;
  needsMoreImages: boolean;
  missingDetails: string[];
}

export interface BatchSale {
  id: string;
  date: string;
  kg: number;
  pricePerKg: number;
  buyer?: string;
  note?: string;
}

export interface BatchLog {
  stage: TableOliveStage;
  startDate: string;
  notes: string;
}

export interface BatchQualityMetrics {
  acidity?: number;
  peroxide?: number;
  k232?: number;
  k270?: number;
  deltaK?: number;
  phenols?: number;
}

export interface Batch {
  id: string;
  parcelId: string;
  recipeId?: string;
  oliveType?: string;
  harvestDate: string;
  weight: number;
  quality: 'Premium' | 'Good' | 'Standard' | 'Commercial';
  qualityScore?: number;
  status: 'ACTIVE' | 'ARCHIVED';
  laborHours?: number;
  laborCost?: number;
  yieldType: 'Oil' | 'Table';
  oilYieldLiters?: number;
  tableOliveYieldKg?: number;
  traceabilityCode?: string;
  currentStage?: TableOliveStage;
  stageStartDate?: string;
  completedStages?: TableOliveStage[];
  sales?: BatchSale[];
  logs?: BatchLog[];
  qualityMetrics?: BatchQualityMetrics;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  note: string;
  parcelId?: string;
  batchId?: string;
}

export interface Sensor {
  id: string;
  name: string;
  type: 'Moisture' | 'Temperature' | 'NPK' | 'PH';
  value: string;
  unit: string;
  parcelId: string;
  status: 'Online' | 'Offline' | 'Low Battery';
}

export interface Task {
  id: string;
  title: string;
  priority: 'Lav' | 'Middels' | 'Høy' | 'Kritisk';
  category: string;
  user: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  parcelId?: string;
  dueDate?: string; 
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  flavorProfile?: FlavorProfile;
  description?: string;
  recommendedOliveTypes?: string[];
  ingredients: Ingredient[];
  brineChangeDays?: number[];
  marinadeDayFrom?: number;
  readyAfterDays?: number;
  rating: number;
  notes: string;
  isAiGenerated: boolean;
  isQualityAssured: boolean;
}

export interface PruningHistoryItem {
  id: string;
  date: string;
  images: string[]; 
  treeType: string;
  ageEstimate: string;
  analysis?: ComprehensiveAnalysis;
  plan?: PruningPlan;
  scheduledTime?: string;
  parcelId?: string;
}

// --- NEW TYPES FOR PROFITABILITY DASHBOARD ---

export type CostCategory = 
  | 'GJØDSEL' 
  | 'PLANTEVERN' 
  | 'VANN' 
  | 'STRØM'
  | 'ARBEIDSKRAFT' 
  | 'VEDLIKEHOLD' 
  | 'INNHØSTING' 
  | 'EMBALLASJE' 
  | 'TRANSPORT' 
  | 'MARKEDSFORING' 
  | 'ADMINISTRASJON'
  | 'FASTE' // (f.eks. eiendomsskatt, lån, forsikring)
  | 'ANNET';

export type RevenueCategory = 
  | 'OLIVENOLJE' 
  | 'SPISEOLIVEN' 
  | 'BALSAMICO'
  | 'TURISME'
  | 'STOTTEORDNINGER' 
  | 'ANNET';

export interface CostItem {
  id: string;
  date: string; // YYYY-MM-DD
  category: CostCategory;
  amount: number; // Negative value
  description: string;
  parcelId?: string; // Optional: link cost to a specific parcel
  equipmentId?: string; // Optional: link cost to specific equipment
}

export interface RevenueItem {
  id: string;
  date: string; // YYYY-MM-DD
  category: RevenueCategory;
  amount: number; // Positive value
  description: string;
  product: string; // e.g., "Dona Anna EVOO 500ml", "Balsamico Bianco"
  unitsSold: number;
  pricePerUnit: number;
  batchId?: string; // Optional: link revenue to a production batch
}

export interface ProfitabilitySnapshot {
  id: string;
  type: 'Total' | 'Parcel' | 'Product';
  label: string;
  timeframe: string;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  revenueBreakdown: Partial<Record<RevenueCategory, number>>;
  costBreakdown: Partial<Record<CostCategory, number>>;
}

// ── Farm economics: harvest logging, expenses, subsidies ─────────────────────

export type SalesChannel =
  | 'cooperativa'       // raw olives to coop
  | 'bordoliven'        // table olives
  | 'olje_premier'      // oil – extra virgin premier
  | 'olje_export';      // oil – export grade

export type ExpenseCategory =
  | 'innhøsting'        // harvesting labour + machinery
  | 'beskjæring'        // pruning
  | 'nye_planter'       // new plants
  | 'trefelling'        // dead tree / branch removal
  | 'sprøyting'         // spraying / plant protection
  | 'vann'              // water / irrigation
  | 'gjødsel'           // fertiliser
  | 'forsikring'        // insurance
  | 'vedlikehold'       // machinery & maintenance
  | 'administrasjon'    // admin / accountant
  | 'transport'         // transport
  | 'emballasje'        // packaging
  | 'annet';            // other

export type SubsidyType =
  | 'eu_okologisk'      // EU organic farming support
  | 'eu_pao'            // EU olive oil production support
  | 'annet';            // other subsidy

export interface HarvestRecord {
  id: string;
  parcelId: string;
  season: string;        // "2024" = harvest year
  date: string;          // YYYY-MM-DD
  variety: string;       // Picual, Arbequina, …
  kg: number;
  channel: SalesChannel;
  pricePerKg: number;    // EUR
  notes?: string;
}

export interface FarmExpense {
  id: string;
  date: string;
  season: string;
  category: ExpenseCategory;
  description: string;
  amount: number;        // EUR, positive
  scope: 'farm' | 'parcel';
  parcelId?: string;
}

export interface SubsidyIncome {
  id: string;
  date: string;
  season: string;
  type: SubsidyType;
  amount: number;        // EUR
  description: string;
}

