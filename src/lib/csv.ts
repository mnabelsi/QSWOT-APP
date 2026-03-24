import type { EnrichedAccount, Template } from '../types';

export function exportCSV(accounts: EnrichedAccount[], template: Template, scores: Record<string, Record<string, number>>): void {
  const allCriteria = [...template.attractivenessCriteria, ...template.capabilityCriteria];

  const headers = [
    'Account',
    'Type',
    'Size (K€)',
    'Attractiveness Score',
    'Capability Score',
    'Zone',
    ...allCriteria.map(c => c.name),
  ];

  const rows = accounts.map(account => {
    const accountScores = scores[account.id] || {};
    return [
      account.name,
      account.type,
      account.size.toString(),
      account.attractivenessScore.toString(),
      account.capabilityScore.toString(),
      account.zone,
      ...allCriteria.map(c => accountScores[c.id]?.toString() ?? ''),
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `kam-intelligence-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
