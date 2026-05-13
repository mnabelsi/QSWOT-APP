export interface Benchmark {
  score: number;
  label: string;
}

export interface Criterion {
  id: string;
  name: string;
  unit: string;
  weight: number;
  sortOrder: number;
  benchmarks: Benchmark[];
}

// ─────────────────────────────────────────────────────────────
// Dynamic account fields
// ─────────────────────────────────────────────────────────────

export interface AccountFieldDef {
  id: string;
  key: string;           // camelCase key used in account.customFields
  name: string;          // display label
  type: 'number' | 'text' | 'select';
  unit?: string;         // e.g. "beds", "K visitors"
  options?: string[];    // for select type
}

export interface ChartDisplayConfig {
  sizeField: string;    // field key for bubble radius (e.g. 'size', 'beds', 'monthlyVisitors')
  colorField: string;   // field key for bubble color (e.g. 'zone', 'contractStatus', custom key)
}

// ─────────────────────────────────────────────────────────────
// Template
// ─────────────────────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  attractivenessCriteria: Criterion[];
  capabilityCriteria: Criterion[];
  accountFields?: AccountFieldDef[];     // custom fields for this template
  chartConfig?: ChartDisplayConfig;      // how to encode bubbles visually
}

// ─────────────────────────────────────────────────────────────
// Account
// ─────────────────────────────────────────────────────────────

export type AccountType = 'hospital' | 'clinic' | 'surgical_center' | 'university_hospital' | 'distributor' | 'gpo' | 'other' | (string & {});
export type Ownership = 'public' | 'private' | 'mixed' | (string & {});
export type ContractStatus = 'active' | 'expiring' | 'expired' | 'prospect' | 'none';
export type StrategicPriority = 'high' | 'medium' | 'low';

export interface AccountContact {
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface Account {
  id: string;
  templateId?: string;
  name: string;
  size: number;                         // primary size / revenue metric
  type: AccountType;
  territory?: string;
  ownership?: Ownership;
  beds?: number;
  therapeuticAreas?: string[];
  contact?: AccountContact;
  contractStatus?: ContractStatus;
  strategicPriority?: StrategicPriority;
  notes?: string;
  customFields?: Record<string, string | number>;  // dynamic per-template fields
  createdAt: string;
  lastScoredAt?: string;
}

export type Scores = Record<string, Record<string, number>>;

export interface EnrichedAccount extends Account {
  attractivenessScore: number;
  capabilityScore: number;
  zone: Zone;
  scoredCount: number;
  totalCriteria: number;
}

export type Zone = 'green' | 'yellow' | 'red';

export type Screen = 'portfolio' | 'accounts' | 'templates';

export type ScoringMode = 'guided' | 'overview';
