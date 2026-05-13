import type { AccountFieldDef } from '../types';

export const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 — Balanced (Recommended)' },
  { id: 'claude-opus-4-7', label: 'Opus 4.7 — Most Capable' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 — Fastest & Cheapest' },
] as const;

// ─────────────────────────────────────────────────────────────
// Default prompt templates — use {token} placeholders
// ─────────────────────────────────────────────────────────────

export const DEFAULT_PROMPTS = {
  websiteAnalysis: `Analyze the company at this URL: {website}

Generate a KAM scoring template tailored to this company's products, industry, and target market.

Requirements:
- 5–7 Opportunity Attractiveness criteria: measure how attractive each account is FROM the seller's perspective (revenue potential, strategic value, purchasing behavior, etc.)
- 5–7 Capability to Serve criteria: measure the company's ability to serve each account (logistics, product fit, access, coverage, etc.)
- 4–6 account types that best describe the kinds of organizations this company sells to (e.g. "hospital", "pharmacy chain", "retailer", "wholesaler", "enterprise", "clinic" — use terms natural to this industry)

Each criterion:
  - name: short, clear criterion name
  - unit: what is being measured (e.g. "K€/year", "% completion", "units/month", "hours travel")
  - weight: decimal (ALL weights within each axis MUST sum exactly to 1.0)
  - benchmarks: exactly 5 objects sorted from best to worst:
      [{"score":3,"label":"..."},{"score":2,"label":"..."},{"score":1,"label":"..."},{"score":0,"label":"..."},{"score":-1,"label":"..."}]

Return ONLY this JSON (nothing before or after):
{
  "companyName": "...",
  "industry": "...",
  "summary": "One sentence describing the company and its market focus.",
  "accountTypes": ["type1", "type2", "type3", "type4", "other"],
  "attractivenessCriteria": [...],
  "capabilityCriteria": [...]
}`,

  fieldSuggestion: `Based on this company and industry:
- Company: {company_name}
- Industry: {industry}
- Summary: {summary}

Identify 3–6 custom account profiling fields most relevant for KAM analysis in this industry, beyond standard fields (name, revenue, account type, territory, ownership, contract status, strategic priority).

For each field:
  - key: camelCase identifier (e.g. "monthlyVisitors", "annualBudget", "employeeCount")
  - name: human-readable label (e.g. "Monthly Visitors", "Annual Budget", "Employee Count")
  - type: "number" | "text" | "select"
  - unit: (number type only) short unit label, e.g. "K visitors/mo", "K€", "employees"
  - options: (select type only) array of 3–6 string values

Return ONLY a JSON array (nothing before or after):
[{"key":"annualBudget","name":"Annual Budget","type":"number","unit":"K€"}]`,

  marketResearch: `List 8–10 top potential client accounts for {company_name} ({industry}) in: {territory}.

Focus on accounts that represent high business value for a {industry} company operating in this region.

For each account provide:
  - name: realistic and specific organization name
  - size: estimated annual revenue potential in K€ (integer)
  - type: one of → {account_types}
  - capacity: primary scale metric as integer (e.g. beds, employees, locations, seats — null if not applicable)
  - territory: specific city or sub-region within {territory}
  - ownership: public | private | mixed
  - contractStatus: prospect | active | expiring | none
  - strategicPriority: high | medium | low
  - zone: green | yellow | red
  - notes: one sentence explaining why this is a strong target for {company_name}
  - customFields: object with estimated values for these industry-specific fields: {custom_fields_spec}

Return ONLY a JSON array (nothing before or after):
[{"name":"...","size":500,"type":"...","capacity":null,"territory":"...","ownership":"public","contractStatus":"prospect","strategicPriority":"high","zone":"green","notes":"...","customFields":{}}]`,
} as const;

// Available tokens per stage — used to render chips in the UI
export const PROMPT_TOKENS = {
  websiteAnalysis: [
    { token: '{website}', description: 'Company website URL entered by the user' },
  ],
  fieldSuggestion: [
    { token: '{company_name}', description: 'Company name from website analysis' },
    { token: '{industry}', description: 'Industry from website analysis' },
    { token: '{summary}', description: 'Company summary from website analysis' },
  ],
  marketResearch: [
    { token: '{company_name}', description: 'Company name detected from website analysis' },
    { token: '{industry}', description: 'Industry detected from website analysis' },
    { token: '{summary}', description: 'One-sentence company summary from analysis' },
    { token: '{territory}', description: 'Target market / territory entered by the user (defaults to META region)' },
    { token: '{account_types}', description: 'Pipe-separated list of account types for this industry (e.g. hospital | clinic | distributor | other)' },
    { token: '{custom_fields_spec}', description: 'Auto-generated spec of industry-specific custom fields to collect per account' },
  ],
} as const;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  prompts?: {
    websiteAnalysis?: string;
    fieldSuggestion?: string;
    marketResearch?: string;
  };
}

export interface SuggestedCriterion {
  name: string;
  unit: string;
  weight: number;
  benchmarks: { score: number; label: string }[];
}

export interface TemplateAnalysis {
  companyName: string;
  industry: string;
  summary: string;
  accountTypes: string[];
  attractivenessCriteria: SuggestedCriterion[];
  capabilityCriteria: SuggestedCriterion[];
}

export interface FieldSuggestion {
  key: string;
  name: string;
  type: 'number' | 'text' | 'select';
  unit?: string;
  options?: string[];
}

export interface SuggestedAccount {
  name: string;
  size: number;
  type: string;
  capacity: number | null;
  territory: string;
  ownership: string;
  contractStatus: string;
  strategicPriority: string;
  zone: string;
  notes: string;
  customFields?: Record<string, string | number>;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function applyTokens(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => tokens[key] ?? `{${key}}`);
}

async function callClaude(
  config: ClaudeConfig,
  system: string,
  userMessage: string,
  maxTokens = 4096,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message ?? `API error: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.content[0].text as string;
}

// ─────────────────────────────────────────────────────────────
// API calls
// ─────────────────────────────────────────────────────────────

export async function analyzeCompanyWebsite(
  config: ClaudeConfig,
  website: string,
): Promise<TemplateAnalysis> {
  const template = config.prompts?.websiteAnalysis?.trim() || DEFAULT_PROMPTS.websiteAnalysis;
  const prompt = applyTokens(template, { website });

  const text = await callClaude(
    config,
    `You are a KAM (Key Account Management) strategist. Respond with valid JSON only — no markdown fences, no commentary before or after.`,
    prompt,
    4096,
  );

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI returned no JSON. Please try again.');
  try {
    return JSON.parse(match[0]) as TemplateAnalysis;
  } catch {
    throw new Error('Could not parse AI response. Please try again.');
  }
}

export async function suggestAccountFields(
  config: ClaudeConfig,
  companyName: string,
  industry: string,
  summary: string,
): Promise<FieldSuggestion[]> {
  const template = config.prompts?.fieldSuggestion?.trim() || DEFAULT_PROMPTS.fieldSuggestion;
  const prompt = applyTokens(template, { company_name: companyName, industry, summary });

  const text = await callClaude(
    config,
    `You are a KAM data architect. Identify the most relevant custom account fields for this industry. Respond with a JSON array only — no markdown, no text before or after.`,
    prompt,
    1024,
  );

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI returned no JSON array for field suggestions.');
  try {
    return JSON.parse(match[0]) as FieldSuggestion[];
  } catch {
    throw new Error('Could not parse field suggestions. Please try again.');
  }
}

export async function researchPotentialAccounts(
  config: ClaudeConfig,
  companyName: string,
  industry: string,
  territory: string,
  summary?: string,
  customFields?: AccountFieldDef[],
  accountTypes?: string[],
): Promise<SuggestedAccount[]> {
  const resolvedTerritory = territory.trim() || 'META region (Middle East, Turkey, Africa)';

  const resolvedAccountTypes = accountTypes && accountTypes.length > 0
    ? accountTypes.join(' | ')
    : 'enterprise | organization | distributor | partner | other';

  const customFieldsSpec = customFields && customFields.length > 0
    ? customFields.map(f => {
        if (f.type === 'number') return `${f.key} (${f.name}, ${f.unit ?? 'number'})`;
        if (f.type === 'select') return `${f.key} (${f.name}, one of: ${(f.options ?? []).join('|')})`;
        return `${f.key} (${f.name}, text)`;
      }).join(', ')
    : 'none — omit customFields from output';

  const template = config.prompts?.marketResearch?.trim() || DEFAULT_PROMPTS.marketResearch;
  const prompt = applyTokens(template, {
    company_name: companyName,
    industry,
    summary: summary ?? '',
    territory: resolvedTerritory,
    account_types: resolvedAccountTypes,
    custom_fields_spec: customFieldsSpec,
  });

  const text = await callClaude(
    config,
    `You are a market intelligence specialist. Identify realistic, named potential client accounts. Respond with a JSON array only — no markdown fences, no text before or after.`,
    prompt,
    4096,
  );

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI returned no JSON array. Please try again.');
  try {
    return JSON.parse(match[0]) as SuggestedAccount[];
  } catch {
    throw new Error('Could not parse AI accounts response. Please try again.');
  }
}

export async function testConnection(config: ClaudeConfig): Promise<void> {
  await callClaude(
    config,
    'You are a test assistant.',
    'Respond with only the word: OK',
    10,
  );
}
