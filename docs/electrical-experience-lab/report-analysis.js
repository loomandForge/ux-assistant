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

const makeReportRequests = (alignedReports, hasMatchedBaseline) => {
  const missingReports = INVESTIGATION_REPORTS
    .filter(required => !reportByType(alignedReports, required.reportType))
    .map(required => ({
      id: required.reportType.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
      kind: 'report',
      label: required.label,
      format: 'PowerManager PDF for the same device and time range',
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
    {
      id: 'equipment-schedule',
      kind: 'operational-data',
      label: 'Equipment schedule or operating-hours export',
      format: 'PDF export covering the event window',
      reason: 'Identifies which scheduled load was expected to start at that time.',
      priority: 'Needed to identify the trigger',
    },
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

export const analyzeReportSet = reports => {
  if (!reports.length) throw new Error('Add at least one report to start an investigation.');

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

  const hypotheses = fullCorrelation
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

  const requests = makeReportRequests(alignedReports, hasMatchedBaseline);
  const excludedReports = reports.filter(
    report => !alignedReports.includes(report) && !comparisonReports.includes(report),
  );

  return {
    status: fullCorrelation ? 'correlated' : 'needs-evidence',
    title: fullCorrelation
      ? 'A short-duration electrical event is the best-supported pattern.'
      : 'More evidence is needed before a root-cause pattern can be supported.',
    summary: fullCorrelation
      ? `The event is corroborated for ${deviceName} across Absolute Energy, Power Peak, and Load Variance. Operational evidence is still required to identify the exact cause.`
      : `${alignedReports.length} aligned report${alignedReports.length === 1 ? '' : 's'} were found for ${deviceName}. The app will not promote a single-report anomaly into a root-cause claim.`,
    confidence: {
      level: fullCorrelation ? 'Medium-high' : 'Low',
      rationale: fullCorrelation
        ? 'The electrical pattern is corroborated across three reports, while the operational trigger remains unknown.'
        : 'The current evidence set cannot independently confirm the anomaly type and its cause.',
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
