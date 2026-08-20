import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.DOMMatrix = class DOMMatrix {};

const { analyzeExtractedReport, analyzeReportSet } = await import('./report-analysis.js');

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

const seriesReport = ({
  sourceFile,
  reportType,
  maximumTimestamp,
  maximumValue,
  unit,
  peakRatio,
  isolatedPeak = true,
  duplicateSeries = false,
  timeRange = '01/06/2020 00:00 to 02/06/2020 00:00',
  total = maximumValue * 10,
}) => ({
  sourceFile,
  reportType,
  timeRange,
  totalPages: 2,
  pagesProcessed: 2,
  truncated: false,
  deviceName: 'pac3200 One',
  measurementPoint: reportType === 'Absolute Energy'
    ? 'Active Energy Import Tariff 1'
    : '(EM) Cumulated Active Power Import',
  unit,
  metrics: {
    kind: 'series',
    readingCount: 96,
    average: maximumValue / peakRatio,
    minimum: { timestamp: '01/06/2020 23:30:00', value: 5.36 },
    maximum: { timestamp: maximumTimestamp, value: maximumValue },
    total,
    peakRatio,
    peakToNeighborRatio: 3,
    highIntervalCount: 1,
    isolatedPeak,
    duplicateSeries,
  },
});

test('asks for corroborating reports when only one report is available', () => {
  const investigation = analyzeReportSet([
    seriesReport({
      sourceFile: 'PM_AbsoluteEnergy.pdf',
      reportType: 'Absolute Energy',
      maximumTimestamp: '01/06/2020 00:30:00',
      maximumValue: 80,
      unit: 'kWh',
      peakRatio: 2.9,
      isolatedPeak: false,
      duplicateSeries: true,
    }),
  ]);

  assert.equal(investigation.status, 'needs-evidence');
  assert.equal(investigation.confidence.level, 'Low');
  assert.ok(investigation.requests.some(request => request.label === 'Power Peak report'));
  assert.ok(investigation.requests.some(request => request.label === 'Load Variance report'));
  assert.match(investigation.summary, /will not promote a single-report anomaly/i);
  assert.equal(investigation.decisionBrief.priority, 'Validate the report configuration first');
  assert.match(investigation.decisionBrief.reason, /1 matching report was found/i);
  assert.match(investigation.decisionBrief.nextAction, /Power Peak report/i);
  assert.match(investigation.decisionBrief.readiness, /not ready to change settings/i);
});

test('correlates three aligned reports into a supported event pattern', () => {
  const investigation = analyzeReportSet([
    seriesReport({
      sourceFile: 'PM_AbsoluteEnergy.pdf',
      reportType: 'Absolute Energy',
      maximumTimestamp: '01/06/2020 00:30:00',
      maximumValue: 80,
      unit: 'kWh',
      peakRatio: 3.1,
      duplicateSeries: true,
    }),
    seriesReport({
      sourceFile: 'PM_PowerPeak.pdf',
      reportType: 'Power Peak',
      maximumTimestamp: '01/06/2020 00:45:00',
      maximumValue: 1100,
      unit: 'kW',
      peakRatio: 27.7,
    }),
    seriesReport({
      sourceFile: 'PM_LoadVariance.pdf',
      reportType: 'Load Variance Analysis',
      maximumTimestamp: '01/06/2020 01:00:00',
      maximumValue: 1100,
      unit: 'kW',
      peakRatio: 27.7,
    }),
  ]);

  assert.equal(investigation.status, 'correlated');
  assert.equal(investigation.hypotheses[0].status, 'Supported pattern');
  assert.match(investigation.title, /short electrical event/i);
  assert.match(investigation.eventWindow, /00:30.*01:00/i);
  assert.equal(investigation.decisionBrief.priority, 'Investigate the event window');
  assert.match(investigation.decisionBrief.reason, /three matching reports/i);
  assert.match(investigation.decisionBrief.readiness, /pattern supported/i);
  assert.ok(investigation.requests.some(request => request.label === 'Expected operating hours'));
  assert.ok(investigation.requests.some(request => request.label === 'Alarm, event, or meter log'));
  assert.ok(!investigation.requests.some(request => request.label === 'Power Peak report'));
});

test('classifies a correlated event as off-hours after operating context is supplied', () => {
  const reports = [
    seriesReport({
      sourceFile: 'PM_AbsoluteEnergy.pdf',
      reportType: 'Absolute Energy',
      maximumTimestamp: '01/06/2020 00:30:00',
      maximumValue: 80,
      unit: 'kWh',
      peakRatio: 3.1,
    }),
    seriesReport({
      sourceFile: 'PM_PowerPeak.pdf',
      reportType: 'Power Peak',
      maximumTimestamp: '01/06/2020 00:45:00',
      maximumValue: 1100,
      unit: 'kW',
      peakRatio: 27.7,
    }),
    seriesReport({
      sourceFile: 'PM_LoadVariance.pdf',
      reportType: 'Load Variance Analysis',
      maximumTimestamp: '01/06/2020 01:00:00',
      maximumValue: 1100,
      unit: 'kW',
      peakRatio: 27.7,
    }),
  ];

  const investigation = analyzeReportSet(reports, {
    occupiedStart: '06:00',
    occupiedEnd: '18:00',
  });

  assert.equal(investigation.category.id, 'off-hours-peak-event');
  assert.equal(investigation.hypotheses[0].id, 'off-hours-operation');
  assert.match(investigation.title, /outside the expected operating hours/i);
  assert.equal(investigation.decisionBrief.priority, 'Investigate the off-hours event');
  assert.match(investigation.decisionBrief.nextAction, /control history/i);
  assert.ok(!investigation.requests.some(request => request.label === 'Expected operating hours'));
  assert.equal(investigation.capabilityRoadmap[0].status, 'Ready now');
});

test('estimates tariff-based impact only with a comparable baseline', () => {
  const current = seriesReport({
    sourceFile: 'PM_AbsoluteEnergy.pdf',
    reportType: 'Absolute Energy',
    maximumTimestamp: '01/06/2020 00:30:00',
    maximumValue: 80,
    unit: 'kWh',
    peakRatio: 3.1,
    total: 1000,
  });
  const baseline = seriesReport({
    sourceFile: 'PM_AbsoluteEnergy_Baseline.pdf',
    reportType: 'Absolute Energy',
    maximumTimestamp: '25/05/2020 00:30:00',
    maximumValue: 60,
    unit: 'kWh',
    peakRatio: 2.5,
    isolatedPeak: false,
    timeRange: '25/05/2020 00:00 to 26/05/2020 00:00',
    total: 800,
  });

  const investigation = analyzeReportSet([current, baseline], {
    currency: 'AUD',
    energyRatePerKwh: 0.25,
  });

  assert.equal(investigation.impact.status, 'estimated');
  assert.equal(investigation.impact.value, 'AUD 50');
  assert.match(investigation.impact.summary, /200 kWh above/i);
  assert.ok(!investigation.requests.some(request => request.label === 'Energy tariff'));
  assert.ok(!investigation.requests.some(request => request.label === 'Matched comparison report'));
  assert.equal(investigation.capabilityRoadmap[1].status, 'Ready now');
});
