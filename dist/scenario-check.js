import { buildStrategicArtifacts } from './detail.js';
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
const baseResult = () => ({
    scores: [
        {
            parameter: 'user_flow_interaction',
            score: 2.8,
            alignmentPct: 56,
            deviationPct: 44,
            summary: 'moderate'
        },
        {
            parameter: 'content_information_architecture',
            score: 3.2,
            alignmentPct: 64,
            deviationPct: 36,
            summary: 'good'
        }
    ],
    evidence: [
        {
            parameter: 'user_flow_interaction',
            label: 'Flow map evidence',
            detail: 'Primary task recovery path partially documented.',
            confidence: 'observed'
        }
    ],
    issues: [
        {
            parameter: 'accessibility_wcag',
            severity: 'high',
            title: 'Keyboard navigation validation missing',
            recommendation: 'Provide keyboard traversal evidence for all critical actions.',
            evidence: 'No explicit keyboard traversal sequence in artifacts.'
        },
        {
            parameter: 'technical_feasibility',
            severity: 'medium',
            title: 'Performance envelope unknown',
            recommendation: 'Define worst-case data/performance bounds.',
            evidence: 'No explicit throughput target in technical notes.'
        },
        {
            parameter: 'content_information_architecture',
            severity: 'low',
            title: 'Help copy coverage partial',
            recommendation: 'Add explicit empty/error/help copy for support paths.',
            evidence: 'Secondary flow copy is incomplete.'
        }
    ],
    overallAlignmentPct: 60,
    overallDeviationPct: 40,
    strategicBranch: {
        branch: 'dual',
        branchCompositePct: 76,
        problemSolutionFitPct: 74,
        requirementTraceabilityPct: 78,
        confidenceCaution: true,
        inputSource: 'explicit',
        notes: ['scenario']
    }
});
const verifyWeakScenario = () => {
    const result = baseResult();
    const base = result.strategicBranch;
    if (!base)
        throw new Error('baseResult must provide strategicBranch');
    result.strategicBranch = {
        ...base,
        branch: 'improvement',
        branchCompositePct: 62,
        problemSolutionFitPct: 61,
        requirementTraceabilityPct: 64
    };
    const artifacts = buildStrategicArtifacts(result);
    assert(Boolean(artifacts.improvementPack), 'Weak scenario must include improvementPack');
    assert(!artifacts.persuasionPack, 'Weak scenario must not include persuasionPack');
    assert((artifacts.edgeCaseFindings?.length ?? 0) > 0, 'Weak scenario must include edgeCaseFindings');
};
const verifyStrongScenario = () => {
    const result = baseResult();
    const base = result.strategicBranch;
    if (!base)
        throw new Error('baseResult must provide strategicBranch');
    result.strategicBranch = {
        ...base,
        branch: 'persuasion',
        branchCompositePct: 86,
        problemSolutionFitPct: 85,
        requirementTraceabilityPct: 87,
        confidenceCaution: false
    };
    const artifacts = buildStrategicArtifacts(result);
    assert(Boolean(artifacts.persuasionPack), 'Strong scenario must include persuasionPack');
    assert(!artifacts.improvementPack, 'Strong scenario must not include improvementPack');
    assert((artifacts.flowIaStructure?.nodes.length ?? 0) >= 5, 'Strong scenario must include structured flow nodes');
    assert((artifacts.flowIaStructure?.edges.length ?? 0) >= 5, 'Strong scenario must include structured flow edges');
    assert((artifacts.flowIaStructure?.scenarios.length ?? 0) >= 3, 'Strong scenario must include flow scenarios');
};
const verifyDualScenario = () => {
    const result = baseResult();
    const base = result.strategicBranch;
    if (!base)
        throw new Error('baseResult must provide strategicBranch');
    result.strategicBranch = {
        ...base,
        branch: 'dual',
        branchCompositePct: 77,
        problemSolutionFitPct: 75,
        requirementTraceabilityPct: 79,
        confidenceCaution: true
    };
    const artifacts = buildStrategicArtifacts(result);
    assert(Boolean(artifacts.persuasionPack), 'Dual scenario must include persuasionPack');
    assert(Boolean(artifacts.improvementPack), 'Dual scenario must include improvementPack');
    const tags = new Set((artifacts.edgeCaseFindings ?? []).map(item => item.tag));
    assert(tags.has('failure-scenario'), 'Dual scenario must include failure-scenario tag');
    const scenarioNames = new Set((artifacts.flowIaStructure?.scenarios ?? []).map(item => item.name));
    assert(scenarioNames.has('rare-user-path'), 'Dual scenario must include rare-user-path scenario');
};
const main = () => {
    verifyWeakScenario();
    verifyStrongScenario();
    verifyDualScenario();
    console.log('Scenario check passed: weak/strong/dual matrix');
};
main();
