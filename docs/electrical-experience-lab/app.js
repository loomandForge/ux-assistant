const byId = id => document.getElementById(id);

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

  byId('scenario-id').textContent = scenario.scenarioId.replace('-', ' ');
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

fetch('./scenario-001.json', { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error(`Scenario request failed: ${response.status}`);
    return response.json();
  })
  .then(render)
  .catch(showError);
