const REQUIRED_COLUMNS = [
  'Name',
  'Work (kWh)',
  'Peak Power (kW)',
];

const OPTIONAL_COLUMNS = [
  'Priority',
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

const numberValue = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.replaceAll(',', '').trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};

const formatNumber = value =>
  new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value);

const sortDescending = (rows, key) =>
  [...rows]
    .filter(row => row[key] !== null)
    .sort((left, right) => right[key] - left[key]);

const countValues = (rows, key) => {
  const counts = new Map();
  for (const row of rows) {
    const value = row[key] || 'Not assessed';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1]));
};

const normalizeRow = row => ({
  name: String(row.Name ?? '').trim(),
  priority: String(row.Priority ?? '').trim() || null,
  workKwh: numberValue(row['Work (kWh)']),
  peakPowerKw: numberValue(row['Peak Power (kW)']),
  durationHours: numberValue(row['Duration (h)']),
  utilisationPercent: numberValue(row['Utilisation (%)']),
  powerFactor: numberValue(row['Power Factor']),
  peakPotentialKw: numberValue(row['Peak Potential (kW)']),
  basePotentialKwh: numberValue(row['Base Potential (kWh)']),
  problem: String(row.Problem ?? '').trim() || null,
  suggestion: String(row.Suggestion ?? '').trim() || null,
  hint: String(row.Hint ?? '').trim() || null,
  remark: String(row.Remark ?? '').trim() || null,
});

const isProbableCounterOverflow = row =>
  (row.workKwh !== null && row.workKwh >= 2_000_000_000) ||
  (row.peakPowerKw !== null && row.peakPowerKw >= 1_000_000);

const readXml = (zip, path) => {
  const entry = zip.file(path);
  if (!entry) throw new Error(`The workbook is missing ${path}.`);
  return entry.async('string');
};

const parseXml = text => {
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('The workbook XML could not be read.');
  return xml;
};

const columnIndex = reference => {
  const letters = reference.match(/^[A-Z]+/)?.[0] ?? '';
  return [...letters].reduce(
    (index, letter) => index * 26 + letter.charCodeAt(0) - 64,
    0,
  ) - 1;
};

const parseWorksheetRows = (sheetXml, sharedStrings) => {
  const xml = parseXml(sheetXml);
  return [...xml.querySelectorAll('sheetData > row')].map(rowElement => {
    const values = [];
    for (const cell of rowElement.querySelectorAll('c')) {
      const index = columnIndex(cell.getAttribute('r') ?? '');
      const type = cell.getAttribute('t');
      const raw = cell.querySelector('v')?.textContent ?? '';
      let value = raw;
      if (type === 's') value = sharedStrings[Number(raw)] ?? '';
      else if (type === 'inlineStr') value = cell.querySelector('is')?.textContent ?? '';
      else if (type !== 'str' && raw !== '') value = numberValue(raw) ?? raw;
      values[index] = value;
    }
    return values;
  });
};

const workbookRows = async file => {
  if (!globalThis.JSZip) {
    throw new Error('The Excel reader is unavailable. Reload the page and try again.');
  }

  const zip = await globalThis.JSZip.loadAsync(await file.arrayBuffer());
  const workbookXml = parseXml(await readXml(zip, 'xl/workbook.xml'));
  const relationshipsXml = parseXml(
    await readXml(zip, 'xl/_rels/workbook.xml.rels'),
  );
  const selectedSheet = [...workbookXml.querySelectorAll('sheets > sheet')]
    .find(sheet => sheet.getAttribute('name') === 'Report') ??
    workbookXml.querySelector('sheets > sheet');
  if (!selectedSheet) throw new Error('No worksheet was found in the Excel file.');

  const relationshipId = selectedSheet.getAttribute('r:id') ??
    selectedSheet.getAttributeNS(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'id',
    );
  const relationship = [...relationshipsXml.querySelectorAll('Relationship')]
    .find(item => item.getAttribute('Id') === relationshipId);
  const target = relationship?.getAttribute('Target');
  if (!target) throw new Error('The worksheet relationship could not be resolved.');
  const sheetPath = target.startsWith('/')
    ? target.slice(1)
    : `xl/${target.replace(/^\.\//, '')}`;

  const sharedEntry = zip.file('xl/sharedStrings.xml');
  const sharedStrings = sharedEntry
    ? [...parseXml(await sharedEntry.async('string')).querySelectorAll('si')]
        .map(item => [...item.querySelectorAll('t')].map(text => text.textContent ?? '').join(''))
    : [];

  return {
    sheetName: selectedSheet.getAttribute('name') ?? 'Worksheet',
    rows: parseWorksheetRows(await readXml(zip, sheetPath), sharedStrings),
  };
};

export const analyzeWorkbookRows = ({ rows, sourceFile, sheetName = 'Worksheet' }) => {
  const headerIndex = rows.findIndex(row =>
    REQUIRED_COLUMNS.every(column => row.includes(column)),
  );
  if (headerIndex < 0) {
    throw new Error(
      `The Excel report needs these columns: ${REQUIRED_COLUMNS.join(', ')}.`,
    );
  }

  const header = rows[headerIndex].map(value => String(value ?? '').trim());
  const knownColumns = new Set([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);
  const title = String(rows.slice(0, headerIndex).flat().find(Boolean) ?? 'Performance & Optimization report');
  const records = rows
    .slice(headerIndex + 1)
    .map(values => Object.fromEntries(
      header
        .map((column, index) => [column, values[index]])
        .filter(([column]) => knownColumns.has(column)),
    ))
    .map(normalizeRow)
    .filter(row => row.name);

  if (!records.length) throw new Error('No asset rows were found in the Excel report.');

  const invalidRows = records.filter(isProbableCounterOverflow);
  const validRows = records.filter(row => !isProbableCounterOverflow(row));
  const topWork = sortDescending(validRows, 'workKwh').slice(0, 5);
  const topBasePotential = sortDescending(validRows, 'basePotentialKwh').slice(0, 5);
  const topPeakPotential = sortDescending(validRows, 'peakPotentialKw').slice(0, 5);
  const period = title.match(/\(([^)]+)\)/)?.[1] ?? 'Period not found';
  const primary = invalidRows.length
    ? {
        label: 'Data-quality review',
        value: String(invalidRows.length),
        unit: invalidRows.length === 1 ? 'row' : 'rows',
        title: `${invalidRows.length} probable counter-overflow rows need review.`,
        summary: 'These rows were excluded from contributor and optimization rankings before any recommendation was generated.',
      }
    : {
        label: 'Assets assessed',
        value: String(validRows.length),
        unit: 'assets',
        title: `${validRows.length} assets are available for optimization review.`,
        summary: 'Rankings preserve the source application names and treat its problem and suggestion columns as reported assessments.',
      };

  return {
    sourceFile,
    sourceFormat: 'xlsx',
    sourceApplication: 'Unspecified energy-management application',
    reportType: 'Performance & Optimization',
    timeRange: period,
    totalPages: 1,
    pagesProcessed: 1,
    truncated: false,
    deviceName: 'Multiple assets',
    location: 'Not provided',
    measurementPoint: 'Asset performance summary',
    unit: 'kWh / kW',
    compareTimeRange: null,
    metrics: {
      kind: 'optimization',
      title,
      sheetName,
      rowCount: records.length,
      validRowCount: validRows.length,
      invalidRows,
      topWork,
      topBasePotential,
      topPeakPotential,
      priorityCounts: countValues(records, 'priority'),
      problemCounts: countValues(records, 'problem'),
    },
    primary,
    evidence: [
      { label: 'Source format', value: `Excel worksheet: ${sheetName}` },
      { label: 'Assets found', value: String(records.length) },
      { label: 'Rows used for ranking', value: String(validRows.length) },
      { label: 'Rows excluded', value: String(invalidRows.length) },
      ...(topWork[0]
        ? [{ label: 'Highest valid work value', value: `${topWork[0].name}: ${formatNumber(topWork[0].workKwh)} kWh` }]
        : []),
    ],
    recommendations: [
      ...(invalidRows.length
        ? [{
            title: 'Verify probable counter overflow or reset values',
            rationale: `Review meter configuration and source data for ${invalidRows.map(row => row.name).join(', ')}.`,
          }]
        : []),
      ...(topBasePotential[0]
        ? [{
            title: `Validate the reported base-load opportunity for ${topBasePotential[0].name}`,
            rationale: `The source report lists ${formatNumber(topBasePotential[0].basePotentialKwh)} kWh of base potential. Confirm it with interval data and an operating schedule before treating it as savings.`,
          }]
        : []),
      ...(topPeakPotential[0]
        ? [{
            title: `Validate the reported peak opportunity for ${topPeakPotential[0].name}`,
            rationale: `The source report lists ${formatNumber(topPeakPotential[0].peakPotentialKw)} kW of peak potential. Confirm it against the site peak window and equipment sequence.`,
          }]
        : []),
    ],
    unknowns: [
      'The source application is not identified in the workbook.',
      'The asset hierarchy is not provided, so site totals may double-count parent and child meters.',
      'Source-reported problems, suggestions, and potential values have not been independently verified.',
    ],
    extraction: {
      label: 'Native Excel table',
      detail: `${records.length} named asset rows and ${header.length} columns were extracted from ${sheetName}.`,
    },
  };
};

export const analyzeWorkbookReport = async (file, onProgress = () => {}) => {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Choose an XLSX workbook.');
  }
  onProgress({ stage: 'opening' });
  const extracted = await workbookRows(file);
  onProgress({ stage: 'analyzing' });
  return analyzeWorkbookRows({
    ...extracted,
    sourceFile: file.name,
  });
};
