import { analyzePdfReport } from './report-analysis.js';

const byId = id => document.getElementById(id);

let selectedReport = null;

const formatCapability = capability => capability.replaceAll('_', ' ');

const addListItems = (target, items) => {
  target.replaceChildren();
  for (const item of items) {
    const listItem = document.createElement('li');
    listItem.textContent = item;
    target.append(listItem);
  }
};

const renderEvidence = evidence => {
  const grid = byId('evidence-grid');
  grid.replaceChildren();

  for (const item of evidence.filter(entry => entry.visible)) {
    const article = document.createElement('article');
    const label = document.createElement('h3');
    const value = document.createElement('p');
    label.textContent = item.label;
    value.textContent = item.value;
    article.append(label, value);
    grid.append(article);
  }
};

const renderClaims = claims => {
  const list = byId('explanation-list');
  list.replaceChildren();

  for (const claim of claims) {
    const article = document.createElement('article');
    const type = document.createElement('span');
    const text = document.createElement('p');
    type.textContent = claim.claimType;
    text.textContent = claim.text;
    article.append(type, text);
    list.append(article);
  }
};

const renderStages = ax => {
  const path = byId('stage-path');
  path.replaceChildren();

  for (const stage of ax.stagePath) {
    const item = document.createElement('li');
    item.textContent = stage;
    if (stage === ax.currentStage) item.dataset.state = 'current';
    if (stage === ax.recommendedStage) item.dataset.state = 'next';
    path.append(item);
  }
};

const renderCritics = critics => {
  const checks = critics.results.flatMap(result => result.checks);
  const passing = checks.filter(check => check.status === 'pass').length;
  byId('critic-count').textContent = `${passing}/${checks.length}`;

  const list = byId('critic-list');
  list.replaceChildren();
  for (const check of checks) {
    const row = document.createElement('article');
    const name = document.createElement('strong');
    const status = document.createElement('span');
    name.textContent = check.id.replaceAll('_', ' ');
    status.textContent = check.status;
    status.dataset.status = check.status;
    row.append(name, status);
    list.append(row);
  }
};

const renderHiddenDetails = details => {
  const container = byId('hidden-details');
  container.replaceChildren();
  for (const detail of details) {
    const item = document.createElement('div');
    const label = document.createElement('span');
    const value = document.createElement('strong');
    label.textContent = detail.label;
    value.textContent = detail.value;
    item.append(label, value);
    container.append(item);
  }
};

const renderReportEvidence = evidence => {
  const grid = byId('report-evidence-grid');
  grid.replaceChildren();

  for (const item of evidence) {
    const article = document.createElement('article');
    const label = document.createElement('h3');
    const value = document.createElement('p');
    label.textContent = item.label;
    value.textContent = item.value;
    article.append(label, value);
    grid.append(article);
  }
};

const renderRecommendations = recommendations => {
  const list = byId('recommendation-list');
  list.replaceChildren();

  for (const recommendation of recommendations) {
    const article = document.createElement('article');
    const title = document.createElement('h3');
    const rationale = document.createElement('p');
    title.textContent = recommendation.title;
    rationale.textContent = recommendation.rationale;
    article.append(title, rationale);
    list.append(article);
  }
};

const renderReportAnalysis = analysis => {
  byId('result-report-type').textContent = analysis.reportType;
  byId('report-result-heading').textContent = analysis.primary.title;
  byId('result-summary').textContent = analysis.primary.summary;
  byId('result-primary-value').textContent = analysis.primary.value;
  byId('result-primary-label').textContent = `${analysis.primary.label} (${analysis.primary.unit})`;
  byId('result-device').textContent = analysis.deviceName;
  byId('result-measurement').textContent = analysis.measurementPoint;
  byId('result-time-range').textContent = analysis.timeRange;
  byId('result-source').textContent = analysis.sourceFile;
  byId('interpretation-text').textContent =
    `${analysis.primary.summary} ${analysis.unknowns[0]}`;
  byId('extraction-label').textContent = analysis.extraction.label;
  byId('extraction-detail').textContent = analysis.extraction.detail;
  byId('page-boundary').textContent = analysis.truncated
    ? `The first ${analysis.pagesProcessed} of ${analysis.totalPages} pages were inspected. Use a smaller export for full coverage.`
    : `All ${analysis.totalPages} report pages were inspected.`;

  renderReportEvidence(analysis.evidence);
  renderRecommendations(analysis.recommendations);
  addListItems(byId('report-unknowns'), analysis.unknowns);

  byId('import-workspace').hidden = true;
  byId('report-processing').hidden = true;
  byId('report-error').hidden = true;
  byId('report-results').hidden = false;
  if (window.location.hash) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
  byId('report-results').focus({ preventScroll: true });
  byId('report-results').scrollIntoView({ block: 'start', behavior: 'auto' });
};

const resetReportFlow = () => {
  selectedReport = null;
  byId('report-form').reset();
  byId('selected-file').textContent = 'No report selected';
  byId('file-prompt').textContent = 'Choose a report';
  byId('analyze-report').disabled = true;
  byId('report-results').hidden = true;
  byId('report-processing').hidden = true;
  byId('report-error').hidden = true;
  byId('import-workspace').hidden = false;
  byId('report-file').focus({ preventScroll: true });
  byId('import-workspace').scrollIntoView({ block: 'start' });
};

const showReportError = error => {
  console.error(error);
  byId('report-processing').hidden = true;
  byId('report-results').hidden = true;
  byId('report-error-message').textContent = error.message;
  byId('report-error').hidden = false;
};

const render = payload => {
  const { scenario, analysis, experience, ax, critics } = payload;
  const total = analysis.calculations.totalEnergyChange;
  const hvac = analysis.calculations.equipmentContributions.find(
    item => item.equipmentId === 'hvac'
  );
  const unknown = analysis.unknowns[0];
  const recommendedCheck = analysis.recommendedChecks[0];

  if (!hvac || !unknown || !recommendedCheck) {
    throw new Error('Scenario 001 is missing required analysis evidence.');
  }

  const sentenceBoundary = experience.primaryMessage.text.indexOf('.');
  const headlineEnd =
    sentenceBoundary >= 0 ? sentenceBoundary + 1 : experience.primaryMessage.text.length;
  const headline = experience.primaryMessage.text.slice(0, headlineEnd);
  const primaryEvidence = experience.primaryMessage.text.slice(headlineEnd).trim();
  byId('primary-message').textContent = headline;
  byId('experience-summary').textContent =
    `${primaryEvidence} ${experience.explanation.summary.text}`;
  byId('energy-change').textContent = `+${total.percentChange}%`;
  byId('energy-delta').textContent = `${total.deltaKwh} kWh`;
  byId('largest-contributor').textContent = `HVAC, ${hvac.shareOfTotalIncreasePercent}%`;
  byId('hours-delta').textContent = `+${analysis.calculations.operatingHoursDelta.deltaHoursPerDay} h/day`;
  byId('root-cause').textContent = 'Unknown';

  byId('check-title').textContent = recommendedCheck.label;
  byId('check-rationale').textContent = recommendedCheck.rationale;
  addListItems(byId('verification-list'), ax.verification.successCriteria);

  byId('autonomy-boundary').textContent = experience.trustElements.autonomyBoundary.text;
  byId('selected-autonomy').textContent = ax.selectedAutonomy;
  addListItems(byId('ai-can'), ax.aiCan.map(formatCapability));
  addListItems(byId('ai-cannot'), ax.aiCannot.map(formatCapability));

  byId('confidence-score').textContent = `${analysis.confidence.score}%`;
  byId('confidence-label').textContent = `${analysis.confidence.level} confidence`;
  byId('confidence-text').textContent = analysis.confidence.rationale;
  byId('uncertainty-text').textContent = experience.trustElements.uncertainty.text;

  renderStages(ax);
  renderEvidence(experience.evidence);
  renderClaims([experience.explanation.summary, ...experience.explanation.claims]);
  renderCritics(critics);
  renderHiddenDetails(experience.hiddenDetails);

  byId('loading-state').hidden = true;
  byId('experience').hidden = false;
};

const showError = error => {
  console.error(error);
  byId('loading-state').hidden = true;
  byId('error-state').hidden = false;
};

byId('review-check').addEventListener('click', event => {
  const button = event.currentTarget;
  const panel = byId('investigation-panel');
  const isOpen = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!isOpen));
  button.textContent = isOpen ? 'Review schedule check' : 'Hide schedule check';
  panel.hidden = isOpen;
  if (!isOpen) panel.focus({ preventScroll: true });
});

byId('report-file').addEventListener('change', event => {
  const [file] = event.currentTarget.files;
  selectedReport = file ?? null;
  byId('analyze-report').disabled = !selectedReport;

  if (!selectedReport) {
    byId('file-prompt').textContent = 'Choose a report';
    byId('selected-file').textContent = 'No report selected';
    return;
  }

  const size = selectedReport.size / (1024 * 1024);
  byId('file-prompt').textContent = 'Report selected';
  byId('selected-file').textContent = `${selectedReport.name} (${size.toFixed(1)} MB)`;
});

byId('report-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!selectedReport) return;

  byId('report-error').hidden = true;
  byId('report-processing').hidden = false;
  byId('processing-status').textContent = 'Opening the PDF...';
  byId('analyze-report').disabled = true;

  try {
    const analysis = await analyzePdfReport(selectedReport, progress => {
      byId('processing-status').textContent =
        `Extracting page ${progress.pageNumber} of ${progress.pageLimit}` +
        (progress.totalPages > progress.pageLimit
          ? ` (${progress.totalPages} pages in the report)`
          : '');
    });
    renderReportAnalysis(analysis);
  } catch (error) {
    showReportError(error instanceof Error ? error : new Error('The report could not be read.'));
  } finally {
    byId('analyze-report').disabled = !selectedReport;
  }
});

byId('replace-report').addEventListener('click', resetReportFlow);
byId('retry-report').addEventListener('click', resetReportFlow);

fetch('./scenario-001.json', { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error(`Scenario request failed: ${response.status}`);
    return response.json();
  })
  .then(render)
  .catch(showError);
