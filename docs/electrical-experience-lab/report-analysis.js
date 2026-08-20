import {
  GlobalWorkerOptions,
  getDocument,
} from './vendor/pdfjs/pdf.min.mjs';

GlobalWorkerOptions.workerSrc = new URL(
  './vendor/pdfjs/pdf.worker.min.mjs',
  import.meta.url,
).href;

const FIELD_LABELS = new Set([
  'Device name',
  'Location',
  'Measurement point',
  'Unit',
]);

const DATE_TIME_PATTERN = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;

const cleanText = value => value.replace(/\s+/g, ' ').trim();

const parseNumber = value => {
  const normalized = value.replaceAll(',', '').trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};

const formatNumber = value =>
  new Intl.NumberFormat('en', {
    maximumFractionDigits: 2,
  }).format(value);

const formatRatio = value =>
  new Intl.NumberFormat('en', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);

const countPhrase = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const parseTimestamp = value => {
  const match = value.match(
    /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return null;
  const [, day, month, year, hour, minute, second = '00'] = match;
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
};

const minutesBetween = (left, right) => {
  const leftTime = parseTimestamp(left);
  const rightTime = parseTimestamp(right);
  if (leftTime === null || rightTime === null) return null;
  return Math.abs(leftTime - rightTime) / 60000;
};

const timeToMinutes = value => {
  if (!/^\d{2}:\d{2}$/.test(value ?? '')) return null;
  const [hour, minute] = value.split(':').map(Number);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
};

const timestampTimeMinutes = value => {
  const match = value.match(/ (\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const isOutsideOperatingHours = (timestamp, occupiedStart, occupiedEnd) => {
  const eventMinutes = timestampTimeMinutes(timestamp);
  const startMinutes = timeToMinutes(occupiedStart);
  const endMinutes = timeToMinutes(occupiedEnd);
  if (eventMinutes === null || startMinutes === null || endMinutes === null) return null;
  const isOccupied = startMinutes <= endMinutes
    ? eventMinutes >= startMinutes && eventMinutes <= endMinutes
    : eventMinutes >= startMinutes || eventMinutes <= endMinutes;
  return !isOccupied;
};

const shortTimestamp = value => {
  const [date, time] = value.split(' ');
  return `${time.slice(0, 5)} on ${date}`;
};

const nextText = (items, label) => {
  const index = items.findIndex(item => item.text === label);
  if (index < 0) return null;
  return items.slice(index + 1).find(item => item.text)?.text ?? null;
};

const findMetadata = pages => {
  const firstPage = pages[0]?.items ?? [];
  return {
    reportType: nextText(firstPage, 'Report type') ?? 'Unknown report',
    timeRange: nextText(firstPage, 'Time range') ?? 'Not found',
    compareTimeRange: nextText(firstPage, 'Compare time range'),
  };
};

const valuesOnLabelRow = (pages, label) => {
  for (const page of pages) {
    const labelItem = page.items.find(item => item.text === label);
    if (!labelItem) continue;
    const values = page.items
      .filter(
        item =>
          item.x > labelItem.x + 90 &&
          Math.abs(item.y - labelItem.y) < 2.5 &&
          !FIELD_LABELS.has(item.text),
      )
      .sort((left, right) => left.x - right.x)
      .map(item => item.text);
    if (values.length) return values;
  }
  return [];
};

const findSeriesIdentity = pages => {
  const deviceNames = valuesOnLabelRow(pages, 'Device name');
  const locations = valuesOnLabelRow(pages, 'Location');
  const measurementPoints = valuesOnLabelRow(pages, 'Measurement point');
  const units = valuesOnLabelRow(pages, 'Unit');

  return {
    deviceName: deviceNames[0] ?? 'Device name not found',
    location: locations[0] ?? 'Location not found',
    measurementPoint: measurementPoints[0] ?? 'Measurement point not found',
    unit: units[0] ?? 'Unit not found',
    duplicateSeries:
      deviceNames.length > 1 &&
      deviceNames.every(value => value === deviceNames[0]) &&
      measurementPoints.every(value => value === measurementPoints[0]),
  };
};

const extractReadings = pages => {
  const readings = [];

  for (const page of pages) {
    const items = page.items;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!DATE_TIME_PATTERN.test(item.text)) continue;

      let value = null;
      for (let offset = index + 1; offset < Math.min(items.length, index + 7); offset += 1) {
        if (DATE_TIME_PATTERN.test(items[offset].text)) break;
        const candidate = parseNumber(items[offset].text);
        if (candidate !== null) {
          value = candidate;
          break;
        }
      }

      if (value !== null) readings.push({ timestamp: item.text, value });
    }
  }

  return readings;
};

const calculateSeries = readings => {
  const minimum = readings.reduce((current, reading) =>
    reading.value < current.value ? reading : current,
  );
  const maximum = readings.reduce((current, reading) =>
    reading.value > current.value ? reading : current,
  );
  const total = readings.reduce((sum, reading) => sum + reading.value, 0);
  const average = total / readings.length;
  const maximumIndex = readings.indexOf(maximum);
  const neighbors = [readings[maximumIndex - 1], readings[maximumIndex + 1]].filter(Boolean);
  const neighborAverage = neighbors.length
    ? neighbors.reduce((sum, reading) => sum + reading.value, 0) / neighbors.length
    : null;
  const peakRatio = maximum.value / average;
  const peakToNeighborRatio = neighborAverage ? maximum.value / neighborAverage : null;
  const highIntervalCount = readings.filter(reading => reading.value >= average * 2).length;
  const isolatedPeak =
    peakRatio >= 3 &&
    peakToNeighborRatio !== null &&
    peakToNeighborRatio >= 2 &&
    highIntervalCount <= Math.max(3, Math.ceil(readings.length * 0.08));

  return {
    minimum,
    maximum,
    total,
    average,
    peakRatio,
    peakToNeighborRatio,
    highIntervalCount,
    isolatedPeak,
  };
};

const joinCell = items =>
  items
    .sort((left, right) => right.y - left.y || left.x - right.x)
    .map(item => item.text)
    .join(' ');

const extractTotalEnergyRows = pages => {
  for (const page of pages) {
    const header = page.items.find(item => item.text === 'Device name');
    const totalHeader = page.items.find(
      item => item.text === 'Total Energy' && item.x > 450,
    );
    if (!header || !totalHeader) continue;

    const anchors = page.items
      .filter(
        item =>
          item.x < 140 &&
          item.y < header.y - 10 &&
          item.y > 60 &&
          item.text !== 'Page :',
      )
      .sort((left, right) => right.y - left.y);

    return anchors.map(anchor => {
      const rowItems = page.items.filter(
        item =>
          item.y < header.y - 10 &&
          item.y > 60 &&
          Math.abs(item.y - anchor.y) <= 16,
      );
      const within = (minimum, maximum) =>
        rowItems.filter(item => item.x >= minimum && item.x < maximum);

      return {
        deviceName: joinCell(within(0, 140)),
        location: joinCell(within(140, 250)),
        measurementPoint: joinCell(within(250, 370)),
        unit: joinCell(within(370, 480)),
        value: parseNumber(joinCell(within(480, Number.POSITIVE_INFINITY))),
      };
    }).filter(row => row.deviceName && row.value !== null);
  }

  return [];
};

const makeSeriesAnalysis = ({ metadata, pages, sourceFile, totalPages, truncated }) => {
  const identity = findSeriesIdentity(pages);
  const readings = extractReadings(pages);

  if (readings.length < 2) return null;

  const statistics = calculateSeries(readings);
  const isEnergy = /energy/i.test(metadata.reportType) || /kwh/i.test(identity.unit);
  const peakDescription = `${formatNumber(statistics.maximum.value)} ${identity.unit} at ${shortTimestamp(statistics.maximum.timestamp)}`;
  const ratio = formatRatio(statistics.peakRatio);
  const duplicateText = identity.duplicateSeries
    ? 'The PDF contains two identical series for this device and measurement point.'
    : 'One series was extracted from the PDF.';

  const recommendations = [
    {
      title: `Investigate the interval at ${shortTimestamp(statistics.maximum.timestamp)}`,
      rationale: `The highest reading is ${ratio} times the report average. Check operating schedules, start-up events, and meter events around this interval.`,
    },
    {
      title: `Compare ${identity.deviceName} with a matched period`,
      rationale: 'Use the same measurement point and an equivalent prior day or week before concluding that consumption or demand has changed.',
    },
  ];

  if (identity.duplicateSeries) {
    recommendations.push({
      title: 'Verify the duplicated series before aggregation',
      rationale: 'Both columns carry the same device name, measurement point, unit, and readings. Count the series once unless the source configuration confirms otherwise.',
    });
  }

  return {
    sourceFile,
    reportType: metadata.reportType,
    timeRange: metadata.timeRange,
    totalPages,
    pagesProcessed: pages.length,
    truncated,
    deviceName: identity.deviceName,
    location: identity.location,
    measurementPoint: identity.measurementPoint,
    unit: identity.unit,
    compareTimeRange: metadata.compareTimeRange,
    metrics: {
      kind: 'series',
      readingCount: readings.length,
      average: statistics.average,
      minimum: statistics.minimum,
      maximum: statistics.maximum,
      total: statistics.total,
      peakRatio: statistics.peakRatio,
      peakToNeighborRatio: statistics.peakToNeighborRatio,
      highIntervalCount: statistics.highIntervalCount,
      isolatedPeak: statistics.isolatedPeak,
      duplicateSeries: identity.duplicateSeries,
    },
    primary: {
      label: isEnergy ? 'Highest energy interval' : 'Highest demand interval',
      value: formatNumber(statistics.maximum.value),
      unit: identity.unit,
      title: `${identity.deviceName} reached ${peakDescription}.`,
      summary: `This is ${ratio} times the ${formatNumber(statistics.average)} ${identity.unit} average across ${readings.length} extracted intervals.`,
    },
    evidence: [
      { label: 'Device', value: identity.deviceName },
      { label: 'Measurement point', value: identity.measurementPoint },
      { label: 'Report average', value: `${formatNumber(statistics.average)} ${identity.unit}` },
      { label: 'Lowest interval', value: `${formatNumber(statistics.minimum.value)} ${identity.unit} at ${shortTimestamp(statistics.minimum.timestamp)}` },
      ...(isEnergy
        ? [{ label: 'Extracted interval sum', value: `${formatNumber(statistics.total)} ${identity.unit}` }]
        : []),
      { label: 'Series check', value: duplicateText },
    ],
    recommendations,
    unknowns: [
      'The report does not explain why the highest interval occurred.',
      'A matched comparison period is not present, so no percentage change is claimed.',
    ],
    extraction: {
      label: 'Native PDF text',
      detail: `${readings.length} timestamped readings and labeled report fields were extracted.`,
    },
  };
};

const makeTotalEnergyAnalysis = ({ metadata, pages, sourceFile, totalPages, truncated }) => {
  const rows = extractTotalEnergyRows(pages);
  if (!rows.length) return null;

  const primaryRow = rows.find(row => row.unit.toLowerCase() === 'kwh') ?? rows[0];
  const hasMixedUnits = new Set(rows.map(row => row.unit.toLowerCase())).size > 1;

  return {
    sourceFile,
    reportType: metadata.reportType,
    timeRange: metadata.timeRange,
    totalPages,
    pagesProcessed: pages.length,
    truncated,
    deviceName: primaryRow.deviceName,
    location: primaryRow.location,
    measurementPoint: primaryRow.measurementPoint,
    unit: primaryRow.unit,
    compareTimeRange: metadata.compareTimeRange,
    metrics: {
      kind: 'total',
      rows,
      hasMixedUnits,
    },
    primary: {
      label: 'Reported total energy',
      value: formatNumber(primaryRow.value),
      unit: primaryRow.unit,
      title: `${primaryRow.deviceName} reports ${formatNumber(primaryRow.value)} ${primaryRow.unit}.`,
      summary: `The value covers ${metadata.timeRange}. This report contains one period, so no increase or anomaly is claimed.`,
    },
    evidence: rows.flatMap(row => [
      { label: `${row.deviceName} device`, value: row.deviceName },
      { label: `${row.deviceName} measurement`, value: `${row.measurementPoint}: ${formatNumber(row.value)} ${row.unit}` },
    ]),
    recommendations: [
      {
        title: `Compare ${primaryRow.deviceName} with an equivalent prior period`,
        rationale: 'A matched baseline is required before the app can calculate a percentage change or identify an unusual increase.',
      },
      ...(hasMixedUnits
        ? [{
            title: 'Normalize units before comparing measurement points',
            rationale: 'The report contains more than one unit. Convert values to a common unit and confirm whether any counter value is cumulative before aggregation.',
          }]
        : []),
      {
        title: 'Confirm the device and measurement-point mapping',
        rationale: 'Keep the report names unchanged and verify that each measurement point represents the intended electrical load.',
      },
    ],
    unknowns: [
      'No matched comparison period is included in this report.',
      'The report does not state the operational reason for the measured total.',
    ],
    extraction: {
      label: 'Native PDF table',
      detail: `${rows.length} labeled measurement rows were extracted without renaming devices.`,
    },
  };
};

const makeFallbackAnalysis = ({ metadata, pages, sourceFile, totalPages, truncated }) => ({
  sourceFile,
  reportType: metadata.reportType,
  timeRange: metadata.timeRange,
  totalPages,
  pagesProcessed: pages.length,
  truncated,
  deviceName: 'Not extracted',
  location: 'Not extracted',
  measurementPoint: 'Not extracted',
  unit: 'Not extracted',
  compareTimeRange: metadata.compareTimeRange,
  metrics: {
    kind: 'metadata',
  },
  primary: {
    label: 'Report recognized',
    value: String(totalPages),
    unit: totalPages === 1 ? 'page' : 'pages',
    title: `${metadata.reportType} report recognized.`,
    summary: 'The report metadata was extracted, but this report type does not yet have a deterministic insight template.',
  },
  evidence: [
    { label: 'Report type', value: metadata.reportType },
    { label: 'Time range', value: metadata.timeRange },
    { label: 'Pages inspected', value: `${pages.length} of ${totalPages}` },
  ],
  recommendations: [
    {
      title: 'Use a supported report for the insight demo',
      rationale: 'Absolute Energy, Total Energy, Power Peak, and Load Variance reports currently produce deterministic insights.',
    },
    {
      title: 'Review this report manually',
      rationale: 'The app will not generate operational conclusions without a tested interpretation rule for the report type.',
    },
  ],
  unknowns: [
    'Device-level readings were not extracted for this report type.',
    'No operational conclusion has been generated.',
  ],
  extraction: {
    label: 'Metadata only',
    detail: 'The report header was read successfully. Device-level interpretation is not enabled.',
  },
});

const INVESTIGATION_REPORTS = [
  {
    reportType: 'Absolute Energy',
    label: 'Absolute Energy report',
    reason: 'Shows whether the event materially affected interval energy.',
  },
  {
    reportType: 'Power Peak',
    label: 'Power Peak report',
    reason: 'Locates the highest demand event and its timestamp.',
  },
  {
    reportType: 'Load Variance Analysis',
    label: 'Load Variance report',
    reason: 'Checks whether the demand event is isolated or sustained.',
  },
];

const reportByType = (reports, reportType) =>
  reports.find(report => report.reportType === reportType);

const mostCommon = values => {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'Not found';
};

const reportSignal = report => {
  if (!report || report.metrics?.kind !== 'series') return null;
  return `${formatNumber(report.metrics.maximum.value)} ${report.unit} at ${shortTimestamp(report.metrics.maximum.timestamp)}`;
};

const makeReportRequests = (alignedReports, hasMatchedBaseline, context) => {
  const missingReports = INVESTIGATION_REPORTS
    .filter(required => !reportByType(alignedReports, required.reportType))
    .map(required => ({
      id: required.reportType.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
      kind: 'report',
      label: required.label,
      format: 'Energy-report PDF for the same device and time range',
      reason: required.reason,
      priority: 'Needed for correlation',
    }));

  return [
    ...missingReports,
    ...(!hasMatchedBaseline
      ? [{
          id: 'matched-baseline',
          kind: 'report',
          label: 'Matched comparison report',
          format: 'Absolute Energy PDF for the previous equivalent day or week',
          reason: 'Confirms whether the pattern is a new change or normal behavior for this device.',
          priority: 'Needed to confirm change',
        }]
      : []),
    ...(!(context.occupiedStart && context.occupiedEnd)
      ? [{
          id: 'equipment-schedule',
          kind: 'operational-data',
          label: 'Expected operating hours',
          format: 'Enter the occupied start and end time below',
          reason: 'Checks whether the event happened outside the expected operating window.',
          priority: 'Needed for off-hours analysis',
        }]
      : []),
    ...(!(context.energyRatePerKwh > 0 && context.currency)
      ? [{
          id: 'energy-tariff',
          kind: 'operational-data',
          label: 'Energy tariff',
          format: 'Enter currency and cost per kWh below',
          reason: 'Required before the app can translate excess energy into an estimated cost.',
          priority: 'Needed for impact estimation',
        }]
      : []),
    {
      id: 'event-log',
      kind: 'operational-data',
      label: 'Alarm, event, or meter log',
      format: 'PDF export covering 30 minutes before and after the event',
      reason: 'Checks for start-up events, trips, resets, or meter anomalies.',
      priority: 'Needed to confirm the cause',
    },
  ];
};

const makeImpactAssessment = ({
  absoluteEnergy,
  comparisonReports,
  context,
}) => {
  const comparison = comparisonReports.find(
    report => report.metrics?.kind === 'series' && report.unit.toLowerCase() === 'kwh',
  );
  const currentTotal = absoluteEnergy?.metrics?.kind === 'series'
    ? absoluteEnergy.metrics.total
    : null;
  const comparisonTotal = comparison?.metrics?.total ?? null;
  const comparableIntervals = Boolean(
    absoluteEnergy?.metrics?.readingCount &&
    absoluteEnergy.metrics.readingCount === comparison?.metrics?.readingCount,
  );
  const hasTariff = context.energyRatePerKwh > 0 && context.currency;

  if (
    currentTotal !== null &&
    comparisonTotal !== null &&
    comparableIntervals &&
    hasTariff
  ) {
    const deltaKwh = currentTotal - comparisonTotal;
    const percentChange = comparisonTotal
      ? (deltaKwh / comparisonTotal) * 100
      : null;
    const estimatedCost = deltaKwh * context.energyRatePerKwh;
    return {
      status: 'estimated',
      label: deltaKwh >= 0 ? 'Estimated excess energy cost' : 'Estimated energy reduction',
      value: `${context.currency.toUpperCase()} ${formatNumber(Math.abs(estimatedCost))}`,
      summary: `${formatNumber(Math.abs(deltaKwh))} kWh ${deltaKwh >= 0 ? 'above' : 'below'} the supplied comparison period${percentChange === null ? '' : ` (${formatRatio(Math.abs(percentChange))}% ${deltaKwh >= 0 ? 'higher' : 'lower'})`}.`,
      evidence: [
        `Current extracted interval sum: ${formatNumber(currentTotal)} kWh.`,
        `Comparison extracted interval sum: ${formatNumber(comparisonTotal)} kWh.`,
        `User-supplied energy rate: ${context.currency.toUpperCase()} ${formatNumber(context.energyRatePerKwh)} per kWh.`,
      ],
      missingInputs: [],
      caveat: 'This estimate excludes demand charges, taxes, weather normalization, and production or occupancy changes. Confirm that the comparison period is operationally equivalent.',
    };
  }

  const missingInputs = [
    ...(!comparison ? ['Matched Absolute Energy comparison report'] : []),
    ...(comparison && !comparableIntervals ? ['Comparison report with the same interval count'] : []),
    ...(!hasTariff ? ['Energy tariff and currency'] : []),
  ];

  return {
    status: 'needs-data',
    label: 'Impact not calculated',
    value: 'More data needed',
    summary: 'The app will not show energy or cost savings until a comparable baseline and tariff are available.',
    evidence: [],
    missingInputs,
    caveat: 'Demand-charge impact requires a separate demand tariff and matched peak-demand baseline.',
  };
};

const makeVerificationPlan = ({ hasMatchedBaseline, hasSchedule, impactReady }) => [
  {
    title: 'Confirm the operating trigger',
    when: 'Before changing any setting',
    evidence: hasSchedule
      ? 'Review the supplied operating hours against the event log and device hierarchy.'
      : 'Add expected operating hours, the event log, and device hierarchy.',
    success: 'A named device or process explains the event window without conflicting evidence.',
  },
  {
    title: 'Lock the comparison baseline',
    when: 'Before estimating benefit',
    evidence: hasMatchedBaseline
      ? 'Confirm that the supplied comparison has equivalent occupancy, production, and weather conditions.'
      : 'Add an equivalent prior day or week with the same interval structure.',
    success: 'The reviewer accepts the comparison period as operationally equivalent.',
  },
  {
    title: 'Apply a human-approved change',
    when: 'Only after the cause is confirmed',
    evidence: 'Document the approved schedule, sequencing, or maintenance change and its rollback condition.',
    success: 'The change is reversible, owned by a person, and does not bypass equipment safeguards.',
  },
  {
    title: 'Verify the result',
    when: 'After a matched operating period',
    evidence: impactReady
      ? 'Compare energy, peak demand, cost estimate, and operational outcomes with the locked baseline.'
      : 'Repeat the same reports and compare energy and peak demand with the locked baseline.',
    success: 'The target event is reduced without a new operational, comfort, or safety issue.',
  },
];

const makeCapabilityRoadmap = ({
  absoluteEnergy,
  alignedReports,
  comparisonReports,
  context,
}) => {
  const hasSchedule = Boolean(context.occupiedStart && context.occupiedEnd);
  const hasTariff = Boolean(context.energyRatePerKwh > 0 && context.currency);
  const hasTotalEnergy = Boolean(reportByType(alignedReports, 'Total Energy'));

  return [
    {
      title: 'Off-hours and schedule investigation',
      status: absoluteEnergy && hasSchedule ? 'Ready now' : 'Add operating hours',
      when: 'Use when an event may have happened before opening, after closing, or during an unoccupied period.',
      requires: ['Absolute Energy report', 'Expected operating hours'],
      outcome: 'Classifies whether the event occurred outside the supplied operating window.',
    },
    {
      title: 'Energy and cost impact',
      status: comparisonReports.length && hasTariff ? 'Ready now' : 'Add baseline and tariff',
      when: 'Use after the anomaly pattern is understood and a credible comparison period is available.',
      requires: ['Matched Absolute Energy report', 'Energy tariff and currency'],
      outcome: 'Estimates the energy difference and tariff-based cost, with explicit exclusions.',
    },
    {
      title: 'Largest-consumer attribution',
      status: hasTotalEnergy ? 'Partial support' : 'Add parser support',
      when: 'Use when the main question is which device or area contributed most to a site-level increase.',
      requires: ['Top 10 Energy or Sankey parser', 'Device hierarchy', 'Total Energy report'],
      outcome: 'Ranks contributors and connects the site-level change to named report devices.',
    },
    {
      title: 'Equipment efficiency and maintenance',
      status: 'Later',
      when: 'Use only when energy can be paired with runtime and useful output such as cooling load or airflow.',
      requires: ['Runtime or ON/OFF status', 'Output or capacity measurement', 'Matched historical performance'],
      outcome: 'Detects efficiency degradation without mistaking higher production for waste.',
    },
    {
      title: 'Automated optimization or control',
      status: 'Not yet',
      when: 'Consider only after recommendations are validated with practitioners and approval, rollback, and equipment safeguards are designed.',
      requires: ['Validated recommendations', 'Human approval workflow', 'Control integration and rollback', 'Safety review'],
      outcome: 'Remains outside this read-only prototype.',
    },
  ];
};

const makeEvidenceSet = reports =>
  reports.map(report => ({
    label: report.reportType,
    value: reportSignal(report) ?? `${report.deviceName}, ${report.timeRange}`,
    sourceFile: report.sourceFile,
  }));

const makePreliminaryHypotheses = ({ alignedReports, duplicateSeries }) => {
  const seriesReports = alignedReports.filter(report => report.metrics?.kind === 'series');
  const strongest = [...seriesReports].sort(
    (left, right) => right.metrics.peakRatio - left.metrics.peakRatio,
  )[0];

  return [
    {
      id: 'short-duration-event',
      rank: 1,
      title: 'Short-duration electrical event',
      status: strongest ? 'Plausible' : 'Insufficient evidence',
      summary: strongest
        ? `${strongest.reportType} contains a concentrated peak, but another aligned report is required before the pattern is treated as corroborated.`
        : 'The uploaded reports do not yet contain a supported interval series.',
      supportingEvidence: strongest
        ? [`${strongest.reportType}: ${reportSignal(strongest)}.`, `${formatRatio(strongest.metrics.peakRatio)} times its report average.`]
        : [],
      conflictingEvidence: ['The event is not yet corroborated across energy, peak, and variance reports.'],
      confirmationCheck: 'Add the requested reports for the same device and time range.',
    },
    {
      id: 'data-configuration-issue',
      rank: 2,
      title: 'Data or report configuration issue',
      status: duplicateSeries ? 'Plausible' : 'Insufficient evidence',
      summary: duplicateSeries
        ? 'A duplicated energy series could overstate aggregation if both columns are counted.'
        : 'No duplicated series has been identified in the current evidence set.',
      supportingEvidence: duplicateSeries
        ? ['The Absolute Energy report contains two identical series labels and values.']
        : [],
      conflictingEvidence: ['No independent meter or configuration log has been supplied.'],
      confirmationCheck: 'Verify the report series configuration and compare it with the meter log.',
    },
  ];
};

const makeOptimizationInvestigation = (report, reports, context) => {
  const {
    rowCount,
    validRowCount,
    invalidRows,
    duplicateNames = [],
    conflictingAssessmentRows = [],
    topBasePotential,
    topPeakPotential,
    topWork,
  } = report.metrics;
  const topBase = topBasePotential[0];
  const topPeak = topPeakPotential[0];
  const invalidNames = invalidRows.map(row => row.name);
  const duplicateNameList = duplicateNames.map(item => item.name);
  const hasDataQualityConcern = Boolean(
    invalidRows.length || duplicateNames.length || conflictingAssessmentRows.length,
  );
  const excludedReports = reports.filter(candidate => candidate !== report);
  const reportEvidence = report.evidence.map(item => ({
    ...item,
    sourceFile: report.sourceFile,
  }));

  const hypotheses = [
    ...(hasDataQualityConcern
      ? [{
          id: 'counter-data-quality',
          rank: 1,
          title: 'Some report data needs checking',
          status: 'Check first',
          summary: `${invalidRows.length} readings are far outside the rest of the report. The app left them out so they do not distort the opportunity ranking.`,
          supportingEvidence: [
            `${invalidRows.length} unusually large energy or power readings were excluded.`,
            ...(duplicateNames.length
              ? [`${duplicateNames.length} device names appear more than once without a unique asset ID.`]
              : []),
            ...(conflictingAssessmentRows.length
              ? [`${conflictingAssessmentRows.length} rows are marked High priority while also described as non-critical or not needing detailed analysis.`]
              : []),
          ],
          conflictingEvidence: [
            'The report does not include meter settings or raw readings, so the exact reason for the unusual values is not known.',
          ],
          confirmationCheck: invalidRows.length
            ? `Ask the metering or data owner to verify ${invalidNames.join(', ')} and provide unique IDs for repeated device names.`
            : 'Ask the data owner to confirm unique device IDs and explain how priority, problem, and suggestion fields are assigned.',
        }]
      : []),
    ...(topBase
      ? [{
          id: 'reported-base-load-opportunity',
          rank: hasDataQualityConcern ? 2 : 1,
          title: `Check the base load for ${topBase.name}`,
          status: 'Opportunity to verify',
          summary: `The report shows ${formatNumber(topBase.basePotentialKwh)} kWh of possible base-load reduction for ${topBase.name}. This is an estimate to investigate, not a confirmed saving.`,
          supportingEvidence: [
            `Source-reported problem: ${topBase.problem ?? 'Not provided'}.`,
            `Source-reported suggestion: ${topBase.suggestion ?? 'Not provided'}.`,
            `Source-reported base potential: ${formatNumber(topBase.basePotentialKwh)} kWh.`,
          ],
          conflictingEvidence: [
            ...(conflictingAssessmentRows.includes(topBase)
              ? ['The same source row says the asset is non-critical and detailed analysis is not required, which conflicts with its High priority and large reported potential.']
              : []),
            'There is no interval profile or operating schedule to show when the base load occurred.',
            'The meter hierarchy is unknown, so parent and child meters may overlap.',
          ],
          confirmationCheck: `Compare ${topBase.name} with its operating schedule and a similar baseline period before proposing a change.`,
        }]
      : []),
    ...(topPeak
      ? [{
          id: 'reported-peak-opportunity',
          rank: (hasDataQualityConcern ? 1 : 0) + (topBase ? 2 : 1),
          title: `Check whether ${topPeak.name} drives the site peak`,
          status: 'Opportunity to verify',
          summary: `The report shows ${formatNumber(topPeak.peakPotentialKw)} kW of possible peak reduction for ${topPeak.name}. It does not show when the peak occurred or what triggered it.`,
          supportingEvidence: [
            `Source-reported problem: ${topPeak.problem ?? 'Not provided'}.`,
            `Source-reported suggestion: ${topPeak.suggestion ?? 'Not provided'}.`,
            `Source-reported peak potential: ${formatNumber(topPeak.peakPotentialKw)} kW.`,
          ],
          conflictingEvidence: [
            ...(conflictingAssessmentRows.includes(topPeak)
              ? ['The source row calls the asset non-critical and says detailed analysis is not required, despite its High priority and large reported peak potential.']
              : []),
            'There is no demand interval report showing when the site peak occurred.',
            'No equipment sequence or event log connects this asset to the site peak.',
          ],
          confirmationCheck: `Compare ${topPeak.name} demand intervals with the site peak and charging schedule.`,
        }]
      : []),
  ];

  if (!hypotheses.length) {
    hypotheses.push({
      id: 'optimization-evidence-gap',
      rank: 1,
      title: 'Optimization cause not established',
      status: 'Insufficient evidence',
      summary: topWork[0]
        ? `${topWork[0].name} has the highest valid work value, but the workbook does not provide a quantified base or peak opportunity.`
        : 'The workbook does not contain enough valid values to rank an optimization opportunity.',
      supportingEvidence: topWork[0]
        ? [`Highest valid work value: ${topWork[0].name}, ${formatNumber(topWork[0].workKwh)} kWh.`]
        : [],
      conflictingEvidence: [
        'No independently verified interval pattern, operating trigger, or quantified potential is available.',
      ],
      confirmationCheck: 'Add timestamped interval data and the expected operating schedule for the leading asset.',
    });
  }

  const requests = [
    ...(invalidRows.length
      ? [{
          id: 'counter-configuration',
          kind: 'operational-data',
          label: 'Meter or counter configuration',
          format: `Raw counter export and multiplier, range, reset, or rollover settings for ${invalidNames.join(', ')}`,
          reason: 'Explains whether the unusual values are caused by overflow, reset, scaling, or valid readings.',
          priority: 'Do this first',
        }]
      : []),
    ...(duplicateNames.length
      ? [{
          id: 'unique-asset-identifiers',
          kind: 'operational-data',
          label: 'Unique IDs for repeated device names',
          format: `Asset register or meter map for ${duplicateNameList.slice(0, 8).join(', ')}${duplicateNameList.length > 8 ? ', and the other repeated names' : ''}`,
          reason: 'Separates different devices that currently share a name and prevents the wrong asset from being investigated.',
          priority: 'Do this first',
        }]
      : []),
    ...(conflictingAssessmentRows.length
      ? [{
          id: 'assessment-rules',
          kind: 'operational-data',
          label: 'Priority and recommendation rules',
          format: 'A short explanation of how Priority, Problem, Suggestion, and Potential are calculated',
          reason: `${conflictingAssessmentRows.length} rows combine High priority with a non-critical or no-analysis-needed message. The ranking cannot be trusted until that conflict is understood.`,
          priority: 'Do this first',
        }]
      : []),
    ...(topBase
      ? [{
          id: 'base-load-interval-data',
          kind: 'report',
          label: `${topBase.name} interval energy report`,
          format: 'CSV, XLSX, or PDF with timestamped kWh for the same month',
          reason: 'Shows whether the reported base opportunity occurs off-hours or is required continuous load.',
          priority: 'Next investigation',
        }]
      : []),
    ...(topPeak
      ? [{
          id: 'peak-demand-interval-data',
          kind: 'report',
          label: `${topPeak.name} and site peak-demand report`,
          format: 'CSV, XLSX, or PDF with aligned timestamped kW intervals',
          reason: 'Shows whether the asset coincides with and materially contributes to the site peak.',
          priority: 'Next investigation',
        }]
      : []),
    {
      id: 'asset-hierarchy',
      kind: 'operational-data',
      label: 'Asset and meter hierarchy',
      format: 'Parent-child meter map or single-line diagram with the workbook asset names',
      reason: 'Prevents double counting and connects reported assets to systems and areas.',
      priority: 'Needed before totals',
    },
    {
      id: 'operating-schedule',
      kind: 'operational-data',
      label: 'Expected operating schedule',
      format: 'Occupied hours and equipment schedules for the priority assets',
      reason: 'Separates required operation from avoidable off-hours or extended runtime.',
      priority: 'Needed before changes',
    },
  ];

  const topOpportunity = topBase
    ? `${topBase.name}: ${formatNumber(topBase.basePotentialKwh)} kWh`
    : topPeak
      ? `${topPeak.name}: ${formatNumber(topPeak.peakPotentialKw)} kW`
      : 'No ranked potential found';

  return {
    status: 'optimization-review',
    title: hasDataQualityConcern
      ? 'Check the report data before acting on its savings estimates.'
      : 'The report contains energy-saving opportunities worth checking.',
    summary: `${rowCount} asset rows were reviewed and ${validRowCount} were used for ranking. The app found ${countPhrase(invalidRows.length, 'unusual reading')}, ${countPhrase(duplicateNames.length, 'repeated device name')}, and ${countPhrase(conflictingAssessmentRows.length, 'source assessment')} that may contradict their priority.`,
    confidence: {
      level: 'Needs review',
      rationale: 'The report was read successfully, but its data quality and internal labels need to be checked before anyone relies on the opportunity ranking.',
    },
    category: {
      id: 'portfolio-optimization-review',
      label: 'Portfolio opportunity and data-quality review',
      rationale: 'The report helps shortlist assets, but it does not include enough operational evidence to confirm why energy was used or how much can be saved.',
    },
    impact: {
      status: 'reported',
      label: 'Highest source-reported opportunity',
      value: topOpportunity,
      summary: topBase
        ? `${topBase.name} has the largest reported base-load opportunity. Validate the estimate before using it in a business case.`
        : 'No source-reported base-load potential was available for a quantified lead.',
      evidence: topBase
        ? [`Source-reported base potential: ${formatNumber(topBase.basePotentialKwh)} kWh.`]
        : [],
      missingInputs: ['Timestamped interval data', 'Expected operating schedule', 'Matched baseline', 'Asset hierarchy'],
      caveat: 'Do not add the workbook values into a site total until the parent-child meter hierarchy is known.',
    },
    decisionBrief: {
      title: 'Validate the report before approving an energy project.',
      priority: 'Review source data first',
      reason: `${countPhrase(invalidRows.length, 'unusual reading')}, ${countPhrase(duplicateNames.length, 'repeated device name')}, and ${countPhrase(conflictingAssessmentRows.length, 'conflicting source assessment')} could change the ranking.`,
      nextAction: invalidRows.length
        ? `Verify the ${countPhrase(invalidRows.length, 'unusual meter reading')} and assign unique IDs to repeated device names.`
        : 'Confirm unique asset IDs, priority rules, and the meter hierarchy.',
      owner: 'Energy manager with the metering or data owner',
      readiness: 'Ready to investigate; not ready to change settings or claim savings',
      assetScope: `${rowCount} assets reviewed`,
    },
    operationalContext: {
      occupiedStart: context.occupiedStart ?? null,
      occupiedEnd: context.occupiedEnd ?? null,
      energyRatePerKwh: context.energyRatePerKwh ?? null,
      currency: context.currency ?? null,
    },
    deviceName: report.deviceName,
    timeRange: report.timeRange,
    reportCount: reports.length,
    alignedReportCount: 1,
    excludedReportCount: excludedReports.length,
    reportTypes: [report.reportType],
    eventWindow: 'No time-of-day data in this report',
    evidence: reportEvidence,
    hypotheses,
    requests,
    verificationPlan: [
      {
        title: 'Check unusual values and repeated names',
        when: 'First',
        evidence: invalidRows.length
          ? `Validate raw readings and counter settings for ${invalidNames.join(', ')}. Add unique IDs for repeated device names.`
          : 'Confirm that source readings, multipliers, and device IDs are valid.',
        success: 'Each unusual value and repeated name is accepted or corrected, with a documented reason.',
      },
      {
        title: 'Confirm which meters can be added together',
        when: 'Before calculating totals',
        evidence: 'Map parent meters, child meters, systems, and areas using the report device names.',
        success: 'Totals do not count the same energy through both a parent and child meter.',
      },
      {
        title: 'Test the leading opportunity',
        when: 'Before recommending a change',
        evidence: 'Add interval data, expected schedules, and event or control logs for the leading asset.',
        success: 'A specific operating condition explains the pattern without contradictory evidence.',
      },
      {
        title: 'Measure what changed',
        when: 'After an approved change',
        evidence: 'Compare a similar post-change period with the agreed baseline and record operational side effects.',
        success: 'Energy or demand improves without creating a safety, comfort, or production problem.',
      },
    ],
    capabilityRoadmap: [
      {
        title: 'Cross-tool asset opportunity ranking',
        status: 'Ready now',
        when: 'Use to identify which named assets deserve investigation first.',
        requires: ['Performance and optimization workbook', 'Data-quality screening'],
        outcome: 'Ranks valid source-reported base and peak opportunities without renaming devices.',
      },
      {
        title: 'Asset-level root-cause confirmation',
        status: 'Add interval data',
        when: 'Use after selecting a priority asset from the workbook.',
        requires: ['Timestamped asset intervals', 'Operating schedule', 'Event or control log'],
        outcome: 'Tests whether schedule, sequencing, standby load, or another operating condition explains the opportunity.',
      },
      {
        title: 'Verified energy and cost impact',
        status: 'Add baseline and tariff',
        when: 'Use only after the source-reported potential has been independently checked.',
        requires: ['Matched baseline', 'Validated interval data', 'Tariff and currency'],
        outcome: 'Calculates measured change and a clearly bounded cost estimate.',
      },
      {
        title: 'Equipment efficiency and maintenance',
        status: 'Later',
        when: 'Use when energy can be paired with runtime and useful output.',
        requires: ['Runtime or ON/OFF status', 'Output or capacity measurement', 'Matched historical performance'],
        outcome: 'Separates efficiency degradation from increased production or load.',
      },
      {
        title: 'Automated optimization or control',
        status: 'Not yet',
        when: 'Consider only after practitioner validation, approval, rollback, and equipment safeguards are designed.',
        requires: ['Validated recommendations', 'Human approval workflow', 'Control integration and rollback', 'Safety review'],
        outcome: 'Remains outside this read-only prototype.',
      },
    ],
    unknowns: [
      ...report.unknowns,
      ...(!context.energyRatePerKwh || !context.currency
        ? ['No tariff was supplied, so no cost impact has been calculated.']
        : []),
      ...(excludedReports.length
        ? [`${excludedReports.length} other uploaded report${excludedReports.length === 1 ? ' was' : 's were'} not combined with this portfolio summary.`]
        : []),
    ],
  };
};

const makeIntervalDecisionBrief = ({
  alignedReports,
  deviceName,
  duplicateSeries,
  fullCorrelation,
  outsideSchedule,
  peakSpreadMinutes,
  requests,
}) => {
  if (fullCorrelation) {
    return {
      title: outsideSchedule
        ? 'Confirm what was running outside expected hours.'
        : 'Confirm what caused the short electrical event.',
      priority: outsideSchedule
        ? 'Investigate the off-hours event'
        : 'Investigate the event window',
      reason: `Three matching reports show peaks within ${formatNumber(peakSpreadMinutes)} minutes. The electrical pattern is supported, but the equipment or operating trigger is still unknown.`,
      nextAction: outsideSchedule
        ? 'Match the event time to the equipment schedule, control history, and alarm log.'
        : 'Match the event window to the equipment schedule and alarm or meter log.',
      owner: 'Energy manager with the facility or controls owner',
      readiness: 'Pattern supported; exact equipment and cause still need confirmation',
      assetScope: deviceName,
    };
  }

  const nextReport = requests.find(
    request => request.kind === 'report' && request.priority === 'Needed for correlation',
  );
  const matchingReportText = `${alignedReports.length} matching report${alignedReports.length === 1 ? '' : 's'} ${alignedReports.length === 1 ? 'was' : 'were'} found`;
  return {
    title: duplicateSeries
      ? 'Check the report setup and add matching evidence.'
      : 'Add matching evidence before approving an action.',
    priority: duplicateSeries
      ? 'Validate the report configuration first'
      : 'Confirm whether the event is real',
    reason: duplicateSeries
      ? `${matchingReportText}, and the energy report contains a repeated series that could affect totals.`
      : `${matchingReportText}. One report can show a possible event, but it cannot confirm the pattern or its cause.`,
    nextAction: nextReport
      ? `Add the ${nextReport.label} for the same device and time period.`
      : 'Add another matching interval report and compare the event time.',
    owner: 'Energy manager or site engineer',
    readiness: 'Ready to review; not ready to change settings or claim savings',
    assetScope: deviceName,
  };
};

export const analyzeReportSet = (reports, context = {}) => {
  if (!reports.length) throw new Error('Add at least one report to start an investigation.');

  const optimizationReport = reports.find(report => report.metrics?.kind === 'optimization');
  const hasIntervalReport = reports.some(report => report.metrics?.kind === 'series');
  if (optimizationReport && !hasIntervalReport) {
    return makeOptimizationInvestigation(optimizationReport, reports, context);
  }

  const deviceName = mostCommon(
    reports.map(report => report.deviceName).filter(value => !/^Not /.test(value)),
  );
  const timeRange = mostCommon(reports.map(report => report.timeRange));
  const alignedReports = reports.filter(
    report =>
      report.timeRange === timeRange &&
      (report.deviceName === deviceName || /^Not /.test(report.deviceName)),
  );
  const comparisonReports = reports.filter(
    report =>
      report.reportType === 'Absolute Energy' &&
      report.deviceName === deviceName &&
      report.timeRange !== timeRange,
  );
  const hasMatchedBaseline =
    comparisonReports.length > 0 || alignedReports.some(report => report.compareTimeRange);
  const absoluteEnergy = reportByType(alignedReports, 'Absolute Energy');
  const powerPeak = reportByType(alignedReports, 'Power Peak');
  const loadVariance = reportByType(alignedReports, 'Load Variance Analysis');
  const seriesReports = [absoluteEnergy, powerPeak, loadVariance].filter(Boolean);
  const duplicateSeries = Boolean(absoluteEnergy?.metrics?.duplicateSeries);
  const peakTimes = seriesReports
    .map(report => report.metrics?.maximum?.timestamp)
    .filter(Boolean);
  const peakSpreadMinutes = peakTimes.length > 1
    ? Math.max(
        ...peakTimes.flatMap((timestamp, index) =>
          peakTimes.slice(index + 1).map(other => minutesBetween(timestamp, other) ?? Infinity),
        ),
      )
    : null;
  const fullCorrelation =
    seriesReports.length === 3 &&
    peakSpreadMinutes !== null &&
    peakSpreadMinutes <= 45 &&
    seriesReports.filter(report => report.metrics?.isolatedPeak).length >= 2;
  const hasSchedule = Boolean(context.occupiedStart && context.occupiedEnd);
  const outsideSchedule = fullCorrelation && hasSchedule
    ? peakTimes.every(timestamp =>
        isOutsideOperatingHours(
          timestamp,
          context.occupiedStart,
          context.occupiedEnd,
        ) === true,
      )
    : false;

  let hypotheses = fullCorrelation
    ? [
        {
          id: 'short-duration-event',
          rank: 1,
          title: 'Short-duration electrical event',
          status: 'Supported pattern',
          summary: `Three aligned reports show concentrated peaks within a ${formatNumber(peakSpreadMinutes)}-minute window. The exact equipment or operating trigger is not identified in the PDFs.`,
          supportingEvidence: seriesReports.map(
            report => `${report.reportType}: ${reportSignal(report)}.`,
          ),
          conflictingEvidence: [
            'No equipment schedule, event log, or device hierarchy identifies what switched on.',
          ],
          confirmationCheck: 'Match the event window to the equipment schedule and alarm or meter log.',
        },
        {
          id: 'data-configuration-issue',
          rank: 2,
          title: 'Data or report configuration issue',
          status: duplicateSeries ? 'Plausible contributor' : 'Insufficient evidence',
          summary: duplicateSeries
            ? 'The duplicated Absolute Energy series may affect totals, but aligned demand reports indicate that an electrical event also occurred.'
            : 'No duplicated series has been identified in the aligned reports.',
          supportingEvidence: duplicateSeries
            ? ['Two Absolute Energy columns have the same device, measurement point, unit, and readings.']
            : [],
          conflictingEvidence: [
            'Power Peak and Load Variance independently show aligned high-demand readings.',
          ],
          confirmationCheck: 'Verify whether the duplicate columns represent one series or two configured channels.',
        },
        {
          id: 'extended-operating-schedule',
          rank: 3,
          title: 'Extended operating schedule',
          status: 'Not supported yet',
          summary: 'The current reports show a concentrated event rather than enough evidence of a sustained schedule extension.',
          supportingEvidence: [],
          conflictingEvidence: [
            'No matched baseline or operating-hours export is present.',
            'At least two reports classify the highest reading as an isolated peak.',
          ],
          confirmationCheck: 'Compare a matched prior period and inspect the equipment operating-hours export.',
        },
      ]
    : makePreliminaryHypotheses({ alignedReports, duplicateSeries });

  if (outsideSchedule) {
    hypotheses = [
      {
        id: 'off-hours-operation',
        rank: 1,
        title: 'Operation outside expected hours',
        status: 'Supported pattern',
        summary: `The correlated event occurred outside the user-supplied ${context.occupiedStart} to ${context.occupiedEnd} operating window. The PDFs still do not identify which equipment was operating.`,
        supportingEvidence: [
          `Correlated event window: ${shortTimestamp(peakTimes[0])} to ${shortTimestamp(peakTimes[peakTimes.length - 1])}.`,
          `User-supplied expected operating hours: ${context.occupiedStart} to ${context.occupiedEnd}.`,
        ],
        conflictingEvidence: [
          'The operating window is user-supplied and has not been verified against the building schedule.',
          'No device hierarchy or event log identifies the operating equipment.',
        ],
        confirmationCheck: 'Confirm the schedule in the building system and match the event to a named device or process.',
      },
      ...hypotheses.map((hypothesis, index) => ({
        ...hypothesis,
        rank: index + 2,
      })),
    ];
  }

  const requests = makeReportRequests(alignedReports, hasMatchedBaseline, context);
  const excludedReports = reports.filter(
    report => !alignedReports.includes(report) && !comparisonReports.includes(report),
  );
  const impact = makeImpactAssessment({
    absoluteEnergy,
    comparisonReports,
    context,
  });
  const category = outsideSchedule
    ? {
        id: 'off-hours-peak-event',
        label: 'Off-hours peak-demand event',
        rationale: 'The corroborated peak occurred outside the expected operating window supplied by the user.',
      }
    : fullCorrelation
      ? {
          id: 'peak-demand-event',
          label: 'Peak-demand event',
          rationale: 'Three aligned reports show a concentrated electrical event within a 45-minute correlation window.',
        }
      : duplicateSeries
        ? {
            id: 'interval-and-data-quality',
            label: 'Interval anomaly with a data-quality concern',
            rationale: 'The report contains an interval anomaly and a duplicated series that requires configuration review.',
          }
        : {
            id: 'preliminary-interval-anomaly',
            label: 'Preliminary interval anomaly',
            rationale: 'The current report set is not sufficient to classify a root-cause pattern.',
          };
  const verificationPlan = makeVerificationPlan({
    hasMatchedBaseline,
    hasSchedule,
    impactReady: impact.status === 'estimated',
  });
  const capabilityRoadmap = makeCapabilityRoadmap({
    absoluteEnergy,
    alignedReports,
    comparisonReports,
    context,
  });
  const decisionBrief = makeIntervalDecisionBrief({
    alignedReports,
    deviceName,
    duplicateSeries,
    fullCorrelation,
    outsideSchedule,
    peakSpreadMinutes,
    requests,
  });

  return {
    status: fullCorrelation ? 'correlated' : 'needs-evidence',
    title: outsideSchedule
      ? 'The event happened outside the expected operating hours.'
      : fullCorrelation
        ? 'Three reports point to a short electrical event.'
        : 'This report shows a possible electrical event, but more evidence is needed.',
    summary: outsideSchedule
      ? `The event is corroborated for ${deviceName} and falls outside the user-supplied ${context.occupiedStart} to ${context.occupiedEnd} operating hours. The exact equipment or trigger remains unknown.`
      : fullCorrelation
        ? `The event is corroborated for ${deviceName} across Absolute Energy, Power Peak, and Load Variance. Operational evidence is still required to identify the exact cause.`
        : `${alignedReports.length} aligned report${alignedReports.length === 1 ? '' : 's'} were found for ${deviceName}. The app will not promote a single-report anomaly into a root-cause claim.`,
    confidence: {
      level: fullCorrelation ? 'Medium-high' : 'Low',
      rationale: fullCorrelation
        ? 'The electrical pattern is corroborated across three reports, while the operational trigger remains unknown.'
        : 'The current evidence set cannot independently confirm the anomaly type and its cause.',
    },
    category,
    impact,
    decisionBrief,
    operationalContext: {
      occupiedStart: context.occupiedStart ?? null,
      occupiedEnd: context.occupiedEnd ?? null,
      energyRatePerKwh: context.energyRatePerKwh ?? null,
      currency: context.currency ?? null,
    },
    deviceName,
    timeRange,
    reportCount: reports.length,
    alignedReportCount: alignedReports.length,
    excludedReportCount: excludedReports.length,
    reportTypes: alignedReports.map(report => report.reportType),
    eventWindow: fullCorrelation
      ? `${shortTimestamp(peakTimes[0])} to ${shortTimestamp(peakTimes[peakTimes.length - 1])}`
      : 'Not established',
    evidence: [
      ...makeEvidenceSet(alignedReports),
      ...comparisonReports.map(report => ({
        label: 'Matched baseline candidate',
        value: `${report.reportType}, ${report.timeRange}`,
        sourceFile: report.sourceFile,
      })),
    ],
    hypotheses,
    requests,
    verificationPlan,
    capabilityRoadmap,
    unknowns: [
      'The exact equipment or process that caused the event is not identified.',
      ...(!hasMatchedBaseline
        ? ['The current report set does not include a matched prior period.']
        : []),
      ...(excludedReports.length
        ? [`${excludedReports.length} uploaded report${excludedReports.length === 1 ? ' was' : 's were'} excluded because the device or time range did not align.`]
        : []),
    ],
  };
};

export const analyzeExtractedReport = ({ pages, sourceFile, totalPages }) => {
  const metadata = findMetadata(pages);
  const context = {
    metadata,
    pages,
    sourceFile,
    totalPages,
    truncated: pages.length < totalPages,
  };

  if (metadata.reportType === 'Total Energy') {
    return makeTotalEnergyAnalysis(context) ?? makeFallbackAnalysis(context);
  }

  if (
    metadata.reportType === 'Absolute Energy' ||
    metadata.reportType === 'Power Peak' ||
    metadata.reportType === 'Load Variance Analysis'
  ) {
    return makeSeriesAnalysis(context) ?? makeFallbackAnalysis(context);
  }

  return makeFallbackAnalysis(context);
};

export const analyzePdfReport = async (file, onProgress = () => {}) => {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Choose a PDF report.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await getDocument({ data: bytes }).promise;
  const pageLimit = Math.min(document.numPages, 12);
  const pages = [];

  try {
    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
      onProgress({ pageNumber, pageLimit, totalPages: document.numPages });
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items
        .filter(item => typeof item.str === 'string')
        .map(item => ({
          text: cleanText(item.str),
          x: item.transform[4],
          y: item.transform[5],
        }))
        .filter(item => item.text);
      pages.push({ pageNumber, items });
      page.cleanup();
    }

    if (!pages.some(page => page.items.length)) {
      throw new Error('No readable text was found. This PDF may be scanned or image-only.');
    }

    return analyzeExtractedReport({
      pages,
      sourceFile: file.name,
      totalPages: document.numPages,
    });
  } finally {
    await document.destroy();
  }
};
