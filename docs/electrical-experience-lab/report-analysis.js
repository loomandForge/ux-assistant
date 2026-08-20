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
  return { minimum, maximum, total, average, peakRatio: maximum.value / average };
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
