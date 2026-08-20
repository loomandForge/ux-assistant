import { analyzePdfReport, analyzeReportSet } from './report-analysis.js';

const byId = id => document.getElementById(id);

let selectedReports = [];
let selectedAdditionalReports = [];
let analyzedReports = [];
let operationalContext = {};

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
    const priority = document.createElement('span');
    const title = document.createElement('h3');
    const rationale = document.createElement('p');
    const format = document.createElement('small');
    priority.className = 'request-priority';
    priority.textContent = recommendation.priority;
    title.textContent = recommendation.title;
    rationale.textContent = recommendation.rationale;
    format.textContent = recommendation.format;
    article.append(priority, title, rationale, format);
    list.append(article);
  }
};

const renderHypotheses = hypotheses => {
  const list = byId('hypothesis-list');
  list.replaceChildren();

  for (const hypothesis of hypotheses) {
    const article = document.createElement('article');
    const header = document.createElement('header');
    const rank = document.createElement('span');
    const title = document.createElement('h3');
    const status = document.createElement('strong');
    const summary = document.createElement('p');
    const evidenceLayout = document.createElement('div');
    const supporting = document.createElement('section');
    const conflicting = document.createElement('section');
    const supportingTitle = document.createElement('h4');
    const conflictingTitle = document.createElement('h4');
    const supportingList = document.createElement('ul');
    const conflictingList = document.createElement('ul');
    const check = document.createElement('p');

    rank.className = 'hypothesis-rank';
    rank.textContent = `Hypothesis ${hypothesis.rank}`;
    title.textContent = hypothesis.title;
    status.textContent = hypothesis.status;
    status.dataset.status = hypothesis.status.toLowerCase().replaceAll(' ', '-');
    summary.textContent = hypothesis.summary;
    supportingTitle.textContent = 'Supporting evidence';
    conflictingTitle.textContent = 'Counter-evidence or gap';
    addListItems(supportingList, hypothesis.supportingEvidence.length
      ? hypothesis.supportingEvidence
      : ['No direct supporting evidence in the current report set.']);
    addListItems(conflictingList, hypothesis.conflictingEvidence);
    check.className = 'confirmation-check';
    check.textContent = `Confirmation check: ${hypothesis.confirmationCheck}`;

    header.append(rank, title, status);
    supporting.append(supportingTitle, supportingList);
    conflicting.append(conflictingTitle, conflictingList);
    evidenceLayout.className = 'hypothesis-evidence';
    evidenceLayout.append(supporting, conflicting);
    article.append(header, summary, evidenceLayout, check);
    list.append(article);
  }
};

const renderVerificationPlan = plan => {
  const list = byId('verification-plan');
  list.replaceChildren();

  for (const item of plan) {
    const article = document.createElement('article');
    const when = document.createElement('span');
    const title = document.createElement('h4');
    const evidence = document.createElement('p');
    const success = document.createElement('p');
    when.textContent = item.when;
    title.textContent = item.title;
    evidence.textContent = item.evidence;
    success.className = 'success-criterion';
    success.textContent = `Success: ${item.success}`;
    article.append(when, title, evidence, success);
    list.append(article);
  }
};

const renderCapabilityRoadmap = capabilities => {
  const list = byId('capability-roadmap-list');
  list.replaceChildren();

  for (const capability of capabilities) {
    const article = document.createElement('article');
    const header = document.createElement('header');
    const title = document.createElement('h3');
    const status = document.createElement('strong');
    const when = document.createElement('p');
    const outcome = document.createElement('p');
    const requirements = document.createElement('div');
    const requirementsLabel = document.createElement('span');
    const requirementsList = document.createElement('ul');

    title.textContent = capability.title;
    status.textContent = capability.status;
    status.dataset.status = capability.status.toLowerCase().replaceAll(' ', '-');
    when.textContent = capability.when;
    outcome.textContent = capability.outcome;
    outcome.className = 'roadmap-outcome';
    requirementsLabel.textContent = 'Requires';
    addListItems(requirementsList, capability.requires);
    requirements.append(requirementsLabel, requirementsList);
    header.append(title, status);
    article.append(header, when, outcome, requirements);
    list.append(article);
  }
};

const renderReportAnalysis = (investigation, reports) => {
  byId('result-report-type').textContent = investigation.status === 'correlated'
    ? 'Correlated root-cause investigation'
    : 'Preliminary root-cause investigation';
  byId('report-result-heading').textContent = investigation.title;
  byId('result-summary').textContent = investigation.summary;
  byId('result-primary-value').textContent = investigation.confidence.level;
  byId('result-primary-label').textContent = 'Pattern confidence';
  byId('result-device').textContent = investigation.deviceName;
  byId('result-measurement').textContent = investigation.eventWindow;
  byId('result-time-range').textContent = investigation.timeRange;
  byId('result-source').textContent = `${investigation.alignedReportCount} of ${investigation.reportCount} uploaded reports`;
  byId('interpretation-text').textContent =
    `${investigation.hypotheses[0].summary} ${investigation.confidence.rationale}`;
  byId('extraction-label').textContent = `${investigation.alignedReportCount} aligned reports`;
  byId('extraction-detail').textContent = investigation.reportTypes.join(', ') || 'No supported interval reports';

  const totalPages = reports.reduce((sum, report) => sum + report.totalPages, 0);
  const pagesProcessed = reports.reduce((sum, report) => sum + report.pagesProcessed, 0);
  const truncatedCount = reports.filter(report => report.truncated).length;
  byId('page-boundary').textContent = truncatedCount
    ? `${pagesProcessed} of ${totalPages} total pages were inspected. ${truncatedCount} report${truncatedCount === 1 ? ' was' : 's were'} truncated at the 12-page safety limit.`
    : `All ${totalPages} pages across the uploaded report set were inspected.`;

  byId('investigation-category').textContent = investigation.category.label;
  byId('investigation-category-rationale').textContent = investigation.category.rationale;
  byId('impact-value').textContent = investigation.impact.value;
  byId('impact-summary').textContent = investigation.impact.summary;
  addListItems(byId('impact-evidence'), investigation.impact.evidence);
  byId('impact-evidence').hidden = !investigation.impact.evidence.length;
  addListItems(byId('impact-missing'), investigation.impact.missingInputs);
  byId('impact-missing').hidden = !investigation.impact.missingInputs.length;
  byId('impact-caveat').textContent = investigation.impact.caveat;

  renderHypotheses(investigation.hypotheses);
  renderVerificationPlan(investigation.verificationPlan);
  renderCapabilityRoadmap(investigation.capabilityRoadmap);
  renderReportEvidence(investigation.evidence.map(item => ({
    label: item.label,
    value: `${item.value} Source: ${item.sourceFile}`,
  })));
  renderRecommendations(investigation.requests.map(request => ({
    title: request.label,
    rationale: request.reason,
    priority: request.priority,
    format: request.format,
  })));
  byId('request-summary').textContent = investigation.status === 'correlated'
    ? 'The electrical pattern is supported. Add operational evidence to identify the exact equipment or trigger.'
    : 'Add the requested reports for the same device and period. The analysis will rerun automatically after upload.';
  addListItems(byId('report-unknowns'), investigation.unknowns);

  const contextParts = [
    investigation.operationalContext.occupiedStart && investigation.operationalContext.occupiedEnd
      ? `Operating hours ${investigation.operationalContext.occupiedStart} to ${investigation.operationalContext.occupiedEnd}`
      : null,
    investigation.operationalContext.energyRatePerKwh && investigation.operationalContext.currency
      ? `${investigation.operationalContext.currency.toUpperCase()} ${investigation.operationalContext.energyRatePerKwh} per kWh`
      : null,
  ].filter(Boolean);
  byId('context-status').textContent = contextParts.length
    ? contextParts.join('. ')
    : 'No operational context applied';

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
  selectedReports = [];
  selectedAdditionalReports = [];
  analyzedReports = [];
  operationalContext = {};
  byId('report-form').reset();
  byId('additional-report-form').reset();
  byId('operational-context-form').reset();
  byId('selected-file').textContent = 'No reports selected';
  byId('additional-file-status').textContent = 'No additional reports selected';
  byId('context-status').textContent = 'No operational context applied';
  byId('file-prompt').textContent = 'Choose reports';
  byId('analyze-report').disabled = true;
  byId('add-reports').disabled = true;
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

const fileSelectionLabel = files => {
  if (!files.length) return 'No reports selected';
  const totalSize = files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
  return `${files.length} report${files.length === 1 ? '' : 's'} selected (${totalSize.toFixed(1)} MB)`;
};

byId('report-file').addEventListener('change', event => {
  selectedReports = [...event.currentTarget.files];
  byId('analyze-report').disabled = !selectedReports.length;
  byId('file-prompt').textContent = selectedReports.length
    ? `${selectedReports.length} report${selectedReports.length === 1 ? '' : 's'} selected`
    : 'Choose reports';
  byId('selected-file').textContent = fileSelectionLabel(selectedReports);
});

byId('additional-report-files').addEventListener('change', event => {
  selectedAdditionalReports = [...event.currentTarget.files];
  byId('add-reports').disabled = !selectedAdditionalReports.length;
  byId('additional-file-status').textContent = selectedAdditionalReports.length
    ? fileSelectionLabel(selectedAdditionalReports)
    : 'No additional reports selected';
});

const analyzeFiles = async (files, append) => {
  const nextReports = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    byId('processing-status').textContent = `Opening ${file.name} (${index + 1} of ${files.length})...`;
    const analysis = await analyzePdfReport(file, progress => {
      byId('processing-status').textContent =
        `Reading ${file.name}: page ${progress.pageNumber} of ${progress.pageLimit}` +
        (progress.totalPages > progress.pageLimit
          ? ` (${progress.totalPages} pages in the report)`
          : '');
    });
    nextReports.push(analysis);
  }

  const combined = append ? [...analyzedReports, ...nextReports] : nextReports;
  analyzedReports = [...new Map(
    combined.map(report => [
      `${report.sourceFile}|${report.reportType}|${report.timeRange}`,
      report,
    ]),
  ).values()];
  renderReportAnalysis(
    analyzeReportSet(analyzedReports, operationalContext),
    analyzedReports,
  );
};

byId('report-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!selectedReports.length) return;

  byId('report-error').hidden = true;
  byId('report-processing').hidden = false;
  byId('processing-status').textContent = 'Opening the PDF...';
  byId('analyze-report').disabled = true;

  try {
    await analyzeFiles(selectedReports, false);
  } catch (error) {
    showReportError(error instanceof Error ? error : new Error('The report could not be read.'));
  } finally {
    byId('analyze-report').disabled = !selectedReports.length;
  }
});

byId('additional-report-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!selectedAdditionalReports.length) return;

  byId('report-results').hidden = true;
  byId('report-error').hidden = true;
  byId('report-processing').hidden = false;
  byId('add-reports').disabled = true;

  try {
    await analyzeFiles(selectedAdditionalReports, true);
    selectedAdditionalReports = [];
    byId('additional-report-form').reset();
    byId('additional-file-status').textContent = 'No additional reports selected';
  } catch (error) {
    showReportError(error instanceof Error ? error : new Error('The additional reports could not be read.'));
  } finally {
    byId('add-reports').disabled = !selectedAdditionalReports.length;
  }
});

byId('operational-context-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!analyzedReports.length) return;

  const formData = new FormData(event.currentTarget);
  const occupiedStart = String(formData.get('occupiedStart') ?? '');
  const occupiedEnd = String(formData.get('occupiedEnd') ?? '');
  const currency = String(formData.get('currency') ?? '').trim().toUpperCase();
  const rateInput = String(formData.get('energyRatePerKwh') ?? '');
  const rateValue = Number(rateInput);

  if (Boolean(occupiedStart) !== Boolean(occupiedEnd)) {
    byId('context-status').textContent = 'Enter both operating start and operating end.';
    return;
  }

  if (Boolean(currency) !== Boolean(rateInput)) {
    byId('context-status').textContent = 'Enter both currency and energy cost per kWh.';
    return;
  }

  operationalContext = {
    occupiedStart,
    occupiedEnd,
    currency,
    energyRatePerKwh: Number.isFinite(rateValue) && rateValue > 0 ? rateValue : null,
  };

  renderReportAnalysis(
    analyzeReportSet(analyzedReports, operationalContext),
    analyzedReports,
  );
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
