import { STRATEGIC_CONTRACT_VERSION, validateStrategicArtifacts } from './contract.js';
const severityRank = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
};
const toBadge = (alignmentPct) => {
    if (alignmentPct >= 85)
        return 'excellent';
    if (alignmentPct >= 70)
        return 'good';
    if (alignmentPct >= 50)
        return 'warning';
    return 'at-risk';
};
const sectionSeverity = (severities) => {
    if (severities.length === 0) {
        return 'low';
    }
    return severities.reduce((current, next) => {
        return severityRank[next] > severityRank[current]
            ? next
            : current;
    }, 'low');
};
const takeFirstSentence = (value, fallback) => {
    if (!value)
        return fallback;
    const match = value.match(/[^.!?]+[.!?]/);
    return (match?.[0] ?? value).trim();
};
const toHumanParameter = (parameter) => parameter.replace(/_/g, ' ');
const parameterLabel = (parameter) => toHumanParameter(parameter)
    .split(' ')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
const toTitleCase = (value) => value
    .split(' ')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
const severityRankValue = (severity) => {
    if (severity === 'critical')
        return 4;
    if (severity === 'high')
        return 3;
    if (severity === 'medium')
        return 2;
    return 1;
};
const parameterChallengeNudges = {
    user_flow_interaction: 'Where do users hesitate, and what measurable signal confirms flow confidence improves?',
    visual_hierarchy_layout: 'Which visual cue drives first action, and how will you validate faster comprehension?',
    design_system_consistency: 'Which deviations are intentional, and where is the approval/evidence for each exception?',
    accessibility_wcag: 'Which WCAG criteria are still unproven, and what explicit test evidence will close the gap?',
    content_information_architecture: 'What proves labels/grouping reduce navigation mistakes for first-time users?',
    technical_feasibility: 'What implementation risks could block delivery, and what pre-validation reduces this risk?',
    brand_design_quality: 'Which brand cues are strongest, and how will partners perceive distinct value at a glance?'
};
const parameterEdgeCaseChecks = {
    user_flow_interaction: [
        'Validate cancellation/retry behavior in the primary task flow.',
        'Confirm users can recover from partial input without restarting the journey.'
    ],
    visual_hierarchy_layout: [
        'Check layout clarity when content length doubles.',
        'Verify action emphasis still works on small-height viewports.'
    ],
    design_system_consistency: [
        'Audit component variants for token drift against approved patterns.',
        'Confirm fallback components remain visually coherent when system components are unavailable.'
    ],
    accessibility_wcag: [
        'Run keyboard-only traversal including modal open/close and focus return.',
        'Validate contrast for disabled/help/error text, not only primary body copy.'
    ],
    content_information_architecture: [
        'Test whether users can locate support/help content within one navigation step.',
        'Validate error and empty-state copy for clarity and next-action guidance.'
    ],
    technical_feasibility: [
        'Verify performance under worst-case data density and network delay.',
        'Confirm fallback rendering path for missing metadata or media assets.'
    ],
    brand_design_quality: [
        'Validate brand tone consistency across empty, error, and confirmation states.',
        'Check whether reduced-motion mode preserves brand identity cues.'
    ]
};
const edgeCaseTagByParameter = {
    user_flow_interaction: 'failure-scenario',
    accessibility_wcag: 'failure-scenario',
    content_information_architecture: 'rare-user-path',
    visual_hierarchy_layout: 'rare-user-path',
    technical_feasibility: 'operational-exception',
    design_system_consistency: 'operational-exception',
    brand_design_quality: 'rare-user-path'
};
export const buildStrategicArtifacts = (scoring, narrative) => {
    const orderedIssues = [...scoring.issues].sort((a, b) => {
        const severityDelta = severityRankValue(b.severity) - severityRankValue(a.severity);
        if (severityDelta !== 0)
            return severityDelta;
        return a.title.localeCompare(b.title);
    });
    const highToCritical = orderedIssues.filter(issue => issue.severity === 'critical' || issue.severity === 'high');
    const weakestScores = [...scoring.scores]
        .sort((a, b) => a.alignmentPct - b.alignmentPct)
        .slice(0, 2);
    const challengePrompts = (highToCritical.length > 0 ? highToCritical : orderedIssues)
        .slice(0, 2)
        .map(issue => {
        const nudge = parameterChallengeNudges[issue.parameter] ??
            'What evidence will confirm this recommendation materially improves user outcomes?';
        return `${parameterLabel(issue.parameter)}: ${nudge} Focus issue: ${issue.title}.`;
    });
    weakestScores.forEach(score => {
        const nudge = parameterChallengeNudges[score.parameter] ??
            'How will this area show measurable improvement after changes?';
        challengePrompts.push(`${toTitleCase(toHumanParameter(score.parameter))}: ${nudge}`);
    });
    const dedupedChallengePrompts = Array.from(new Set(challengePrompts)).slice(0, 4);
    if (dedupedChallengePrompts.length === 0) {
        dedupedChallengePrompts.push('What is the strongest evidence that this solution improves user outcomes over the baseline?');
    }
    const flowIaHints = scoring.issues
        .filter(issue => issue.parameter === 'user_flow_interaction' ||
        issue.parameter === 'content_information_architecture')
        .slice(0, 3)
        .map(issue => issue.recommendation);
    if (flowIaHints.length === 0) {
        flowIaHints.push('Validate the happy path, failure path, and recovery path for the primary user journey.');
        flowIaHints.push('Ensure labels, grouping, and navigation hierarchy match user intent order.');
    }
    const primaryFlowNode = weakestScores[0]?.parameter ?? 'user_flow_interaction';
    const secondaryFlowNode = weakestScores[1]?.parameter ?? 'content_information_architecture';
    const flowIaStructure = {
        nodes: [
            { id: 'entry', label: 'Entry point', kind: 'entry' },
            { id: 'intake', label: 'Context intake', kind: 'task' },
            { id: 'task-primary', label: parameterLabel(primaryFlowNode), kind: 'task' },
            { id: 'decision', label: 'Decision / validation gate', kind: 'decision' },
            { id: 'recovery', label: 'Recovery branch', kind: 'task' },
            { id: 'task-secondary', label: parameterLabel(secondaryFlowNode), kind: 'task' },
            { id: 'validation', label: 'Final validation', kind: 'decision' },
            { id: 'outcome', label: 'Outcome confirmation', kind: 'outcome' }
        ],
        edges: [
            { from: 'entry', to: 'intake', label: 'Capture initial context' },
            { from: 'intake', to: 'task-primary', label: 'Start primary intent' },
            { from: 'task-primary', to: 'decision', label: 'Validate next action' },
            { from: 'decision', to: 'task-secondary', label: 'Route happy path' },
            { from: 'decision', to: 'recovery', label: 'Route failure path' },
            { from: 'recovery', to: 'task-primary', label: 'Retry primary task' },
            { from: 'recovery', to: 'task-secondary', label: 'Bypass to assisted path' },
            { from: 'task-secondary', to: 'validation', label: 'Check completion criteria' },
            { from: 'validation', to: 'outcome', label: 'Complete with confirmation' }
        ],
        designHints: [
            'Expose a visible recovery path from decision errors back to the primary task.',
            'Keep labels and grouping aligned with first-time user intent order.',
            'Place outcome confirmation immediately after final task completion.'
        ],
        scenarios: [
            {
                name: 'happy-path',
                pathNodeIds: [
                    'entry',
                    'intake',
                    'task-primary',
                    'decision',
                    'task-secondary',
                    'validation',
                    'outcome'
                ],
                goal: 'Primary user completes the intended task with no blockers.',
                riskTag: 'failure-scenario'
            },
            {
                name: 'recovery-path',
                pathNodeIds: [
                    'entry',
                    'intake',
                    'task-primary',
                    'decision',
                    'recovery',
                    'task-primary',
                    'decision',
                    'task-secondary',
                    'validation',
                    'outcome'
                ],
                goal: 'User recovers from a failed validation and still reaches completion.',
                riskTag: 'failure-scenario'
            },
            {
                name: 'rare-user-path',
                pathNodeIds: [
                    'entry',
                    'intake',
                    'decision',
                    'recovery',
                    'task-secondary',
                    'validation',
                    'outcome'
                ],
                goal: 'Rare users can bypass standard flow and still find an understandable outcome.',
                riskTag: 'rare-user-path'
            }
        ]
    };
    const edgeCaseFindings = (highToCritical.length > 0 ? highToCritical : orderedIssues)
        .slice(0, 5)
        .map(issue => ({
        tag: edgeCaseTagByParameter[issue.parameter] ?? 'failure-scenario',
        parameter: issue.parameter,
        severity: issue.severity,
        evidence: issue.evidence,
        recommendation: issue.recommendation
    }));
    const strongestParameters = [...scoring.scores]
        .sort((a, b) => b.alignmentPct - a.alignmentPct)
        .slice(0, 3)
        .map(score => `${toHumanParameter(score.parameter)} (${score.alignmentPct}%)`);
    const proofPoints = scoring.evidence
        .filter(item => item.confidence === 'observed')
        .slice(0, 3)
        .map(item => `${item.label}: ${item.detail}`);
    const objectionHandlers = highToCritical
        .slice(0, 3)
        .map(issue => `Objection in ${toHumanParameter(issue.parameter)}: ${issue.title}. Response: ${issue.recommendation}`);
    const priorityFixes = (highToCritical.length > 0 ? highToCritical : orderedIssues)
        .slice(0, 5)
        .map(issue => `${toTitleCase(toHumanParameter(issue.parameter))} - ${issue.title}: ${issue.recommendation}`);
    const parameterSpecificChecks = weakestScores.flatMap(score => parameterEdgeCaseChecks[score.parameter] ?? []);
    const edgeCaseChecks = [
        'Verify loading, empty, and error states for every primary screen.',
        'Run keyboard-only navigation and focus-order validation for critical tasks.',
        'Test contrast and readability for small text and disabled states.',
        'Validate responsive layout behavior at mobile, tablet, and desktop breakpoints.',
        ...parameterSpecificChecks
    ];
    const nextExperiments = dedupedChallengePrompts
        .slice(0, 3)
        .map(prompt => `Experiment: ${prompt}`);
    const branch = scoring.strategicBranch?.branch ?? 'dual';
    const executiveLead = takeFirstSentence(narrative?.executiveSummary, 'This solution shows potential, but confidence depends on closing observable UX and traceability gaps.');
    const persuasionPack = branch === 'persuasion' || branch === 'dual'
        ? {
            positioning: executiveLead,
            convincePartners: 'Lead with measurable alignment strengths and explicit mitigation plans for the remaining risks.',
            valuePoints: strongestParameters,
            proofPoints: proofPoints.length > 0
                ? proofPoints
                : ['Observed UX signals are available but should be expanded for partner demos.'],
            objectionHandlers: objectionHandlers.length > 0
                ? objectionHandlers
                : [
                    'Objection: Evidence depth is limited. Response: expand observed evidence coverage in the next validation cycle.'
                ]
        }
        : undefined;
    const improvementPack = branch === 'improvement' || branch === 'dual'
        ? {
            priorityFixes: priorityFixes.length > 0
                ? priorityFixes
                : ['No blocking issues detected; focus on medium-priority polish opportunities.'],
            edgeCaseChecks,
            nextExperiments: nextExperiments.length > 0
                ? nextExperiments
                : ['Experiment: compare baseline vs revised flow for task completion confidence.']
        }
        : undefined;
    return validateStrategicArtifacts({
        challengePrompts: dedupedChallengePrompts,
        flowIaHints,
        flowIaStructure,
        edgeCaseFindings,
        persuasionPack,
        improvementPack
    });
};
export const buildReviewDetailPayload = (options) => {
    const strategicArtifacts = buildStrategicArtifacts(options.scoring, options.narrative);
    const sections = options.scoring.scores.map(score => {
        const evidence = options.scoring.evidence
            .filter(item => item.parameter === score.parameter)
            .map(item => ({
            label: item.label,
            detail: item.detail,
            confidence: item.confidence
        }));
        const issues = options.scoring.issues
            .filter(item => item.parameter === score.parameter)
            .map(item => ({
            severity: item.severity,
            title: item.title,
            evidence: item.evidence,
            recommendation: item.recommendation
        }));
        return {
            parameter: score.parameter,
            score: score.score,
            alignmentPct: score.alignmentPct,
            deviationPct: score.deviationPct,
            summary: score.summary,
            narrative: options.narrative?.parameterCommentary[score.parameter],
            evidence,
            issues
        };
    });
    const scoreIndicators = sections.map(section => ({
        parameter: section.parameter,
        alignmentPct: section.alignmentPct,
        deviationPct: section.deviationPct,
        severity: sectionSeverity(section.issues.map(issue => issue.severity)),
        badge: toBadge(section.alignmentPct)
    }));
    return {
        runId: options.runId,
        source: options.source,
        status: options.status,
        stage: options.stage,
        stageMessage: options.stageMessage,
        createdAt: options.createdAt,
        overallAlignmentPct: options.scoring.overallAlignmentPct,
        strategicContractVersion: STRATEGIC_CONTRACT_VERSION,
        strategicBranch: options.scoring.strategicBranch,
        strategicArtifacts,
        executiveSummary: options.narrative?.executiveSummary,
        topRisks: options.narrative?.topRisks,
        scoreIndicators,
        sections
    };
};
