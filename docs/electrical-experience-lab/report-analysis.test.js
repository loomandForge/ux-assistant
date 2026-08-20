import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.DOMMatrix = class DOMMatrix {};

const { analyzeExtractedReport } = await import('./report-analysis.js');

const item = (text, x = 0, y = 0) => ({ text, x, y });

test('interprets a total energy table without renaming report devices', () => {
  const analysis = analyzeExtractedReport({
    sourceFile: 'PM_TotalEnergy.pdf',
    totalPages: 3,
    pages: [
      {
        pageNumber: 1,
        items: [
          item('Report type'),
          item('Total Energy'),
          item('Time range'),
          item('01/06/2020 00:00 to 02/06/2020 00:00'),
        ],
      },
      {
        pageNumber: 3,
        items: [
          item('Device name', 46, 736),
          item('Total Energy', 505, 741),
          item('pac3200 One', 29, 696),
          item('My Area', 144, 696),
          item('Active Energy Import', 258, 696),
          item('Tariff 1', 258, 685),
          item('kWh', 373, 696),
          item('19.81', 558, 696),
          item('vircou', 29, 655),
          item('My Area', 144, 655),
          item('Counter Value', 258, 655),
          item('wh', 373, 655),
          item('39,798.00', 538, 655),
        ],
      },
    ],
  });

  assert.equal(analysis.deviceName, 'pac3200 One');
  assert.equal(analysis.measurementPoint, 'Active Energy Import Tariff 1');
  assert.equal(analysis.primary.value, '19.81');
  assert.match(analysis.primary.summary, /no increase or anomaly is claimed/i);
  assert.ok(analysis.recommendations.some(check => /Normalize units/.test(check.title)));
});

test('calculates interval evidence and flags a duplicated series', () => {
  const analysis = analyzeExtractedReport({
    sourceFile: 'PM_AbsoluteEnergy.pdf',
    totalPages: 2,
    pages: [
      {
        pageNumber: 1,
        items: [
          item('Report type'),
          item('Absolute Energy'),
          item('Time range'),
          item('01/06/2020 00:00 to 02/06/2020 00:00'),
        ],
      },
      {
        pageNumber: 2,
        items: [
          item('Device name', 27, 723),
          item('pac3200 One', 217, 723),
          item('pac3200 One', 407, 723),
          item('Location', 27, 700),
          item('My Area', 217, 700),
          item('My Area', 407, 700),
          item('Measurement point', 27, 676),
          item('Active Energy Import Tariff 1', 217, 676),
          item('Active Energy Import Tariff 1', 407, 676),
          item('Unit', 27, 653),
          item('kWh', 217, 653),
          item('kWh', 407, 653),
          item('01/06/2020 00:00:00', 113, 630),
          item('10', 370, 630),
          item('10', 560, 630),
          item('01/06/2020 00:15:00', 113, 607),
          item('20', 370, 607),
          item('20', 560, 607),
        ],
      },
    ],
  });

  assert.equal(analysis.primary.value, '20');
  assert.match(analysis.primary.summary, /15 kWh average across 2 extracted intervals/i);
  assert.ok(analysis.evidence.some(entry => /two identical series/i.test(entry.value)));
  assert.ok(analysis.recommendations.some(check => /duplicated series/i.test(check.title)));
});
