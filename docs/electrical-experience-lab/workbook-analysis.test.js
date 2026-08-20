import assert from 'node:assert/strict';
import test from 'node:test';

const { analyzeWorkbookRows } = await import('./workbook-analysis.js');
const { analyzeReportSet } = await import('./report-analysis.js');

const headers = [
  'Name',
  'Priority',
  'Work (kWh)',
  'Peak Power (kW)',
  'Duration (h)',
  'Utilisation (%)',
  'Power Factor',
  'Peak Potential (kW)',
  'Base Potential (kWh)',
  'Problem',
  'Suggestion',
  'Hint',
  'Remark',
];

test('extracts vendor-neutral optimization opportunities and excludes overflow-like rows', () => {
  const analysis = analyzeWorkbookRows({
    sourceFile: 'performance.xlsx',
    sheetName: 'Report',
    rows: [
      ['Performance & Optimization Report (July 2026)'],
      headers,
      ['Asset A', 'High', 5000, 50, 100, 50, null, 5, 900, 'base load', 'review', 'hint', ''],
      ['Asset B', 'Medium', 4000, 40, 100, 45, null, 12, 200, 'high peak load', 'review', 'hint', ''],
      ['Bad counter', 'Low', 2147480000, 5681000, 1, 1, null, 0, 0, 'high peak load', 'review', 'hint', ''],
    ],
  });

  assert.equal(analysis.sourceApplication, 'Unspecified energy-management application');
  assert.equal(analysis.metrics.rowCount, 3);
  assert.equal(analysis.metrics.validRowCount, 2);
  assert.equal(analysis.metrics.invalidRows[0].name, 'Bad counter');
  assert.equal(analysis.metrics.topWork[0].name, 'Asset A');
  assert.equal(analysis.metrics.topBasePotential[0].name, 'Asset A');
  assert.equal(analysis.metrics.topPeakPotential[0].name, 'Asset B');
  assert.match(analysis.primary.title, /counter-overflow/i);
});

test('requires the core asset and energy columns', () => {
  assert.throws(
    () => analyzeWorkbookRows({
      sourceFile: 'invalid.xlsx',
      rows: [['Name', 'Energy'], ['Asset', 10]],
    }),
    /needs these columns/i,
  );
});

test('turns a workbook into a bounded optimization investigation', () => {
  const report = analyzeWorkbookRows({
    sourceFile: 'performance.xlsx',
    sheetName: 'Report',
    rows: [
      ['Performance & Optimization Report (July 2026)'],
      headers,
      ['Kälteanlage 7', 'High', 5000, 50, 100, 50, null, 5, 29663.93, 'base load', 'review schedule', 'hint', ''],
      ['EV-Chargepoint 31', 'High', 4000, 80, 100, 45, null, 64.6, 200, 'high peak load', 'review sequencing', 'hint', ''],
      ['Bad counter', 'Low', 2147480000, 5681000, 1, 1, null, 0, 0, 'high peak load', 'review', 'hint', ''],
    ],
  });
  const investigation = analyzeReportSet([report]);

  assert.equal(investigation.status, 'optimization-review');
  assert.equal(investigation.deviceName, 'Multiple assets');
  assert.match(investigation.title, /excluding probable counter errors/i);
  assert.match(investigation.hypotheses[0].title, /counter overflow/i);
  assert.match(investigation.hypotheses[1].title, /Kälteanlage 7/);
  assert.match(investigation.impact.caveat, /parent-child meter hierarchy/i);
  assert.ok(investigation.requests.some(request => request.id === 'asset-hierarchy'));
});
