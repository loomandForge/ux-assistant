import { scoreFromStatuses } from '../validation-engine.js';
import { criticCheckSchema, criticResultSchema, criticSuiteResultSchema, SCENARIO_001_ALLOWED_AUTONOMY_MODES } from './schemas.js';
const buildCheck = ({ id, failures, successEvidence, recommendation, severity = 'high' }) => {
    return criticCheckSchema.parse({
        id,
        status: failures.length === 0 ? 'pass' : 'fail',
        severity,
        confidence: 'high',
        evidence: failures.length === 0 ? [successEvidence] : failures,
        recommendation
    });
};
const buildResult = (criticId, checks) => {
    return criticResultSchema.parse({
        criticId,
        passed: checks.every(check => check.status === 'pass'),
        score: scoreFromStatuses(checks.map(check => check.status)),
        checks
    });
};
const collectAnalysisEvidenceIds = (analysis) => {
    return new Set([
        ...analysis.facts.map(item => item.id),
        analysis.calculations.totalEnergyChange.id,
        ...analysis.calculations.equipmentContributions.map(item => item.id),
        analysis.calculations.operatingHoursDelta.id,
        ...analysis.hypotheses.map(item => item.id),
        ...analysis.unknowns.map(item => item.id),
        ...analysis.recommendedChecks.map(item => item.id)
    ]);
};
const collectExperienceClaims = (experience) => {
    return [
        experience.primaryMessage,
        experience.explanation.summary,
        ...experience.explanation.claims
    ];
};
export const runElectricalCritic = (analysis, experience) => {
    const evidenceIds = collectAnalysisEvidenceIds(analysis);
    const claims = collectExperienceClaims(experience);
    const unsupportedFailures = [];
    for (const claim of claims) {
        const missingRefs = claim.evidenceRefs.filter(reference => !evidenceIds.has(reference));
        if (missingRefs.length > 0) {
            unsupportedFailures.push(`Claim "${claim.text}" has unsupported references: ${missingRefs.join(', ')}.`);
        }
    }
    for (const hypothesis of analysis.hypotheses) {
        const missingRefs = hypothesis.supportedBy.filter(reference => !evidenceIds.has(reference));
        if (missingRefs.length > 0) {
            unsupportedFailures.push(`Hypothesis ${hypothesis.id} has missing support: ${missingRefs.join(', ')}.`);
        }
    }
    for (const check of analysis.recommendedChecks) {
        const missingEvidence = check.evidenceRefs.filter(reference => !evidenceIds.has(reference));
        const missingUnknowns = check.resolvesUnknowns.filter(reference => !evidenceIds.has(reference));
        if (missingEvidence.length > 0 || missingUnknowns.length > 0) {
            unsupportedFailures.push(`Recommended check ${check.id} has unresolved references: ${[
                ...missingEvidence,
                ...missingUnknowns
            ].join(', ')}.`);
        }
    }
    const actions = [experience.primaryAction, ...experience.secondaryActions];
    for (const action of actions) {
        const missingRefs = action.evidenceRefs.filter(reference => !evidenceIds.has(reference));
        if (missingRefs.length > 0) {
            unsupportedFailures.push(`Action ${action.id} has unsupported references: ${missingRefs.join(', ')}.`);
        }
    }
    const unsupportedClaims = buildCheck({
        id: 'unsupported_claims',
        failures: unsupportedFailures,
        successEvidence: `All ${claims.length} experience claims and all analysis hypotheses/checks resolve to measured or calculated evidence.`,
        recommendation: 'Remove unsupported claims or attach them to a fact, calculation, hypothesis, unknown, or recommended check.'
    });
    const uncertaintyFailures = [];
    const hypothesisIds = new Set(analysis.hypotheses.map(item => item.id));
    const unknownIds = new Set(analysis.unknowns.map(item => item.id));
    const surfacedUncertaintyRefs = new Set(experience.trustElements.uncertainty.sourceRefs);
    for (const claim of claims) {
        if (claim.claimType === 'hypothesis') {
            if (!claim.evidenceRefs.some(reference => hypothesisIds.has(reference))) {
                uncertaintyFailures.push(`Hypothesis claim "${claim.text}" does not reference a declared hypothesis.`);
            }
            if (!claim.uncertaintyNote) {
                uncertaintyFailures.push(`Hypothesis claim "${claim.text}" does not expose a limitation.`);
            }
        }
        if (claim.claimType === 'unknown') {
            if (!claim.evidenceRefs.some(reference => unknownIds.has(reference))) {
                uncertaintyFailures.push(`Unknown claim "${claim.text}" does not reference a declared unknown.`);
            }
            if (!claim.uncertaintyNote) {
                uncertaintyFailures.push(`Unknown claim "${claim.text}" does not state the knowledge boundary.`);
            }
        }
        if (claim.claimType === 'hypothesis' || claim.claimType === 'unknown') {
            const declaredRefs = claim.evidenceRefs.filter(reference => hypothesisIds.has(reference) || unknownIds.has(reference));
            const missingTrustRefs = declaredRefs.filter(reference => !surfacedUncertaintyRefs.has(reference));
            if (missingTrustRefs.length > 0) {
                uncertaintyFailures.push(`Trust elements do not surface uncertainty for: ${missingTrustRefs.join(', ')}.`);
            }
        }
    }
    const uncertainty = buildCheck({
        id: 'uncertainty',
        failures: uncertaintyFailures,
        successEvidence: 'Hypotheses and unknowns are labeled, qualified, and surfaced in the trust elements.',
        recommendation: 'Label hypotheses and unknowns explicitly, add limitations, and surface them in the trust layer.',
        severity: 'medium'
    });
    return buildResult('electrical', [unsupportedClaims, uncertainty]);
};
export const runExperienceAxCritic = (scenario, analysis, experience, ax) => {
    const claims = collectExperienceClaims(experience);
    const visibleEvidenceRefs = new Set(experience.evidence
        .filter(item => item.visible)
        .flatMap(item => item.sourceRefs));
    const priorityEvidenceRefs = new Set(claims.flatMap(claim => claim.evidenceRefs));
    const missingVisibleRefs = [...priorityEvidenceRefs].filter(reference => !visibleEvidenceRefs.has(reference));
    const evidenceVisibility = buildCheck({
        id: 'evidence_visibility',
        failures: missingVisibleRefs.map(reference => `Primary or explanatory claim evidence is not visible: ${reference}.`),
        successEvidence: `All ${priorityEvidenceRefs.size} evidence references behind the primary message and explanation are visible.`,
        recommendation: 'Expose the evidence behind the primary message and explanation before presenting the action.'
    });
    const progressiveDisclosureFailures = [];
    if (experience.evidence.filter(item => item.visible).length > 5) {
        progressiveDisclosureFailures.push('More than five evidence items are visible initially.');
    }
    if (experience.secondaryActions.length > 2) {
        progressiveDisclosureFailures.push('More than two secondary actions compete with the primary action.');
    }
    if (experience.hiddenDetails.length === 0) {
        progressiveDisclosureFailures.push('No supporting or technical details are deferred.');
    }
    const hiddenRefs = new Set(experience.hiddenDetails.flatMap(item => item.sourceRefs));
    for (const expectedHiddenRef of [
        'calc.equipment-contribution.lighting',
        'calc.equipment-contribution.other-loads'
    ]) {
        if (!hiddenRefs.has(expectedHiddenRef)) {
            progressiveDisclosureFailures.push(`Supporting load detail is not progressively disclosed: ${expectedHiddenRef}.`);
        }
    }
    const progressiveDisclosure = buildCheck({
        id: 'progressive_disclosure',
        failures: progressiveDisclosureFailures,
        successEvidence: 'One primary action and five essential evidence items are shown; supporting load and raw-reading detail is deferred.',
        recommendation: 'Keep one primary action visible and defer supporting load or technical telemetry.',
        severity: 'medium'
    });
    const autonomyFailures = [];
    const safeModes = new Set(SCENARIO_001_ALLOWED_AUTONOMY_MODES);
    const declaredModes = new Set(scenario.allowedAutonomyModes);
    const axModes = new Set(ax.allowedAutonomyModes);
    const trustModes = new Set(experience.trustElements.autonomyBoundary.allowedModes);
    if (scenario.scenarioId !== analysis.scenarioId ||
        scenario.scenarioId !== experience.scenarioId ||
        scenario.scenarioId !== ax.scenarioId) {
        autonomyFailures.push('Scenario identifiers are inconsistent across the AX flow.');
    }
    for (const mode of declaredModes) {
        if (!safeModes.has(mode)) {
            autonomyFailures.push(`Scenario 001 declares unsafe autonomy mode: ${mode}.`);
        }
    }
    for (const mode of safeModes) {
        if (!declaredModes.has(mode) || !axModes.has(mode) || !trustModes.has(mode)) {
            autonomyFailures.push(`Required safe autonomy mode is not consistently declared: ${mode}.`);
        }
    }
    for (const mode of [...axModes, ...trustModes]) {
        if (!safeModes.has(mode)) {
            autonomyFailures.push(`Recommendation exceeds Scenario 001 autonomy: ${mode}.`);
        }
    }
    if (!safeModes.has(ax.selectedAutonomy)) {
        autonomyFailures.push(`Selected autonomy is not permitted: ${ax.selectedAutonomy}.`);
    }
    const actions = [experience.primaryAction, ...experience.secondaryActions, ax.suggestedNextStep];
    for (const action of actions) {
        if (!safeModes.has(action.autonomyMode)) {
            autonomyFailures.push(`Action ${action.id} uses unsafe autonomy: ${action.autonomyMode}.`);
        }
        if (action.changesEquipmentState) {
            autonomyFailures.push(`Action ${action.id} would change equipment state.`);
        }
    }
    const prohibitedCapabilities = new Set(['change_schedule', 'control_equipment']);
    for (const capability of ax.aiCan) {
        if (prohibitedCapabilities.has(capability)) {
            autonomyFailures.push(`AI capability is unsafe for Scenario 001: ${capability}.`);
        }
    }
    for (const capability of prohibitedCapabilities) {
        if (!ax.aiCannot.includes(capability)) {
            autonomyFailures.push(`AI boundary does not prohibit: ${capability}.`);
        }
    }
    if (ax.suggestedNextStep.id !== experience.primaryAction.id) {
        autonomyFailures.push('AX next step does not match the experience primary action.');
    }
    if (ax.verification.stage !== 'VERIFY') {
        autonomyFailures.push('AX recommendation does not end with explicit verification.');
    }
    const analysisEvidenceIds = collectAnalysisEvidenceIds(analysis);
    const unsupportedVerificationRefs = ax.verification.evidenceRefs.filter(reference => !analysisEvidenceIds.has(reference));
    if (unsupportedVerificationRefs.length > 0) {
        autonomyFailures.push(`AX verification has unsupported references: ${unsupportedVerificationRefs.join(', ')}.`);
    }
    const autonomySafety = buildCheck({
        id: 'autonomy_safety',
        failures: autonomyFailures,
        successEvidence: 'Scenario 001 stays within Assist/Investigate/Recommend and cannot change schedules or control equipment.',
        recommendation: 'Restrict Scenario 001 to Assist, Investigate, and Recommend; keep all control actions human-owned.'
    });
    return buildResult('experience-ax', [
        evidenceVisibility,
        progressiveDisclosure,
        autonomySafety
    ]);
};
export const runCritics = (scenario, analysis, experience, ax) => {
    const electrical = runElectricalCritic(analysis, experience);
    const experienceAx = runExperienceAxCritic(scenario, analysis, experience, ax);
    return criticSuiteResultSchema.parse({
        passed: electrical.passed && experienceAx.passed,
        results: [electrical, experienceAx]
    });
};
