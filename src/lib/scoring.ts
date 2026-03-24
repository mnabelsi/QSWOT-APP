import type { Criterion, Scores, Zone, Account, EnrichedAccount, Template } from '../types';

export function computeComposite(
  criteria: Criterion[],
  accountScores: Record<string, number>
): number {
  let total = 0;
  for (const c of criteria) {
    const scoreVal = accountScores[c.id];
    if (scoreVal !== undefined) {
      total += scoreVal * c.weight * 100;
    }
  }
  return Math.round(total * 100) / 100;
}

function getTier(score: number): number {
  if (score > 100) return 2;
  if (score > 0) return 1;
  return 0;
}

export function getZone(attractivenessScore: number, capabilityScore: number): Zone {
  const aTier = getTier(attractivenessScore);
  const cTier = getTier(capabilityScore);
  if (aTier >= 2 && cTier >= 2) return 'green';
  if (aTier + cTier <= 1) return 'red';
  return 'yellow';
}

export function enrichAccount(
  account: Account,
  template: Template,
  scores: Scores
): EnrichedAccount {
  const accountScores = scores[account.id] || {};
  const attractivenessScore = computeComposite(template.attractivenessCriteria, accountScores);
  const capabilityScore = computeComposite(template.capabilityCriteria, accountScores);
  const zone = getZone(attractivenessScore, capabilityScore);

  const allCriteria = [...template.attractivenessCriteria, ...template.capabilityCriteria];
  const totalCriteria = allCriteria.length;
  let scoredCount = 0;
  for (const c of allCriteria) {
    if (accountScores[c.id] !== undefined) {
      scoredCount++;
    }
  }

  return {
    ...account,
    attractivenessScore,
    capabilityScore,
    zone,
    scoredCount,
    totalCriteria,
  };
}

export function isStale(account: Account): boolean {
  if (!account.lastScoredAt) return false;
  const lastScored = new Date(account.lastScoredAt).getTime();
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  return now - lastScored > ninetyDays;
}
