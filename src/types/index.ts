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

export interface Template {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  attractivenessCriteria: Criterion[];
  capabilityCriteria: Criterion[];
}

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
  name: string;
  size: number;                        // Revenue in €
  type: AccountType;
  territory?: string;                  // Region / area
  ownership?: Ownership;
  beds?: number;                       // Number of beds (hospitals)
  therapeuticAreas?: string[];         // e.g. ["Cardiology", "Oncology"]
  contact?: AccountContact;
  contractStatus?: ContractStatus;
  strategicPriority?: StrategicPriority;
  notes?: string;
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
