import { deriveStrategicInputs, evaluateStrategicBranch } from './policy.js';
/** Severity → penalty in percentage points. */
const UNKNOWN_PENALTY = {
    high: 20,
    medium: 12,
    low: 8
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hasToolSuccess = (bundle, toolName) => {
    return bundle.toolCalls.some(tc => tc.toolName === toolName && tc.status === 'success');
};
const parameterSummary = (label, pct) => {
    if (pct >= 85)
        return `${label} is well-documented with comprehensive evidence.`;
    if (pct >= 70)
        return `${label} has good coverage but missing some key documentation.`;
    if (pct >= 50)
        return `${label} has moderate coverage with notable gaps.`;
    if (pct >= 30)
        return `${label} has limited documentation and needs significant work.`;
    return `${label} is missing most required documentation.`;
};
const evaluateParameter = (bundle, parameter, dependencies, unknownChecks) => {
    const evidence = [];
    const issues = [];
    const depWeight = dependencies.length > 0 ? 100 / dependencies.length : 0;
    let pct = 0;
    for (const dep of dependencies) {
        const success = hasToolSuccess(bundle, dep.tool);
        if (success) {
            pct += depWeight;
            evidence.push({
                parameter,
                label: dep.label,
                detail: `${dep.tool} succeeded. (+${depWeight.toFixed(0)}%)`,
                confidence: 'observed'
            });
        }
        else {
            evidence.push({
                parameter,
                label: dep.label,
                detail: `${dep.tool} data missing or failed. (+0%)`,
                confidence: 'assumed'
            });
            issues.push({
                parameter,
                severity: 'high',
                title: `Missing ${dep.tool} evidence`,
                recommendation: `Re-run with ${dep.tool} included in the review.`,
                evidence: `${dep.tool} is absent or unsuccessful in this run.`
            });
        }
    }
    for (const check of unknownChecks) {
        const penalty = UNKNOWN_PENALTY[check.severity] ?? 8;
        pct -= penalty;
        evidence.push({
            parameter,
            label: check.label,
            detail: `${check.label} is not explicitly evidenced. (−${penalty}%)`,
            confidence: 'unknown'
        });
        issues.push({
            parameter,
            severity: check.severity,
            title: `${check.label} status is unknown`,
            recommendation: check.recommendation,
            evidence: `${check.label} not explicitly represented in retrieved design data.`
        });
    }
    const alignmentPct = clamp(Math.round(pct), 0, 100);
    const score = clamp(parseFloat(((alignmentPct / 100) * 5).toFixed(1)), 0, 5);
    return {
        alignmentPct,
        score,
        summary: parameterSummary(parameter.replace(/_/g, ' '), alignmentPct),
        evidence,
        issues
    };
};
const evaluateDesignSystemAugment = (bundle) => {
    const findings = bundle.designSystemFindings;
    if (!findings || findings.mode === 'none') {
        return { bonusPct: 0, evidence: [], issues: [] };
    }
    const evidence = [];
    const issues = [];
    if (findings.componentFindings.length > 0) {
        evidence.push({
            parameter: 'design_system_consistency',
            label: 'Design system component matches',
            detail: `${findings.componentFindings.length} component matches from ${findings.mode}.`,
            confidence: 'observed'
        });
    }
    if (findings.iconFindings.length > 0) {
        evidence.push({
            parameter: 'design_system_consistency',
            label: 'Design system icon matches',
            detail: `${findings.iconFindings.length} icon matches from ${findings.mode}.`,
            confidence: 'observed'
        });
    }
    if (findings.queriesFailed > 0) {
        issues.push({
            parameter: 'design_system_consistency',
            severity: 'low',
            title: 'Some design system checks failed',
            recommendation: 'Retry design system lookup to improve confidence.',
            evidence: `${findings.queriesFailed} of ${findings.queriesRun} design system queries failed.`
        });
    }
    // Small deterministic bonus based on observed matches.
    const rawBonus = findings.componentFindings.length * 4 + findings.iconFindings.length * 2;
    const bonusPct = clamp(rawBonus, 0, 20);
    return { bonusPct, evidence, issues };
};
/** Default parameter definitions — which tools map to which scoring parameters. */
const DEFAULT_DEFINITIONS = [
    {
        parameter: 'user_flow_interaction',
        title: 'User Flow & Interaction Design',
        dependencies: [
            { tool: 'get_design_context', label: 'Interaction context' },
            { tool: 'get_metadata', label: 'Flow structure metadata' }
        ],
        unknownChecks: [
            {
                label: 'Loading/error/empty interaction states',
                recommendation: 'Document loading, error, and empty states.',
                severity: 'medium'
            },
            {
                label: 'Keyboard shortcut coverage',
                recommendation: 'Specify keyboard shortcuts and focus order.',
                severity: 'medium'
            }
        ]
    },
    {
        parameter: 'visual_hierarchy_layout',
        title: 'Visual Hierarchy & Layout',
        dependencies: [
            { tool: 'get_metadata', label: 'Layout geometry' },
            { tool: 'get_screenshot', label: 'Rendered composition' }
        ],
        unknownChecks: [
            {
                label: 'Responsive breakpoint behavior',
                recommendation: 'Provide explicit breakpoint behavior.',
                severity: 'medium'
            }
        ]
    },
    {
        parameter: 'design_system_consistency',
        title: 'Design System Consistency',
        dependencies: [
            { tool: 'get_variable_defs', label: 'Token usage snapshot' },
            { tool: 'get_design_context', label: 'Component usage context' }
        ],
        unknownChecks: [
            {
                label: 'Approved deviation log',
                recommendation: 'Attach deviation approvals for non-system components.',
                severity: 'low'
            }
        ]
    },
    {
        parameter: 'accessibility_wcag',
        title: 'Accessibility (WCAG 2.1 AA)',
        dependencies: [
            { tool: 'get_design_context', label: 'Semantic and interaction hints' },
            { tool: 'get_screenshot', label: 'Visual contrast surface' }
        ],
        unknownChecks: [
            {
                label: 'WCAG keyboard-only navigation pass',
                recommendation: 'Provide explicit keyboard tab order documentation.',
                severity: 'high'
            },
            {
                label: 'WCAG contrast validation evidence',
                recommendation: 'Attach measured contrast values.',
                severity: 'high'
            },
            {
                label: 'ARIA/semantic mapping evidence',
                recommendation: 'Map UI components to semantic roles and ARIA attributes.',
                severity: 'high'
            }
        ]
    },
    {
        parameter: 'content_information_architecture',
        title: 'Content & Information Architecture',
        dependencies: [
            { tool: 'get_design_context', label: 'Content labels and copy' },
            { tool: 'get_metadata', label: 'Hierarchy and grouping' }
        ],
        unknownChecks: [
            {
                label: 'Error/help microcopy coverage',
                recommendation: 'Include explicit error/help/empty copy.',
                severity: 'medium'
            }
        ]
    },
    {
        parameter: 'technical_feasibility',
        title: 'Technical Feasibility',
        dependencies: [
            { tool: 'get_design_context', label: 'Implementation hints' },
            { tool: 'get_variable_defs', label: 'Token implementation constraints' }
        ],
        unknownChecks: [
            {
                label: 'Complexity and performance envelope',
                recommendation: 'Document expected complexity and performance constraints.',
                severity: 'medium'
            }
        ]
    },
    {
        parameter: 'brand_design_quality',
        title: 'Brand & Design Quality',
        dependencies: [
            { tool: 'get_screenshot', label: 'Visual fidelity surface' },
            { tool: 'get_variable_defs', label: 'Brand token usage' }
        ],
        unknownChecks: [
            {
                label: 'Brand distinction rationale',
                recommendation: 'Describe brand expression and differentiation cues.',
                severity: 'low'
            }
        ]
    }
];
/**
 * Run deterministic scoring against a bundle of Figma MCP tool results.
 * Returns scores for all 7 UX review parameters.
 */
export const runDeterministicScoring = (bundle) => {
    const scores = [];
    const evidence = [];
    const issues = [];
    for (const def of DEFAULT_DEFINITIONS) {
        const evaluation = evaluateParameter(bundle, def.parameter, def.dependencies, def.unknownChecks);
        const designSystemAugment = def.parameter === 'design_system_consistency'
            ? evaluateDesignSystemAugment(bundle)
            : { bonusPct: 0, evidence: [], issues: [] };
        const alignedPct = clamp(evaluation.alignmentPct + designSystemAugment.bonusPct, 0, 100);
        const alignedScore = clamp(parseFloat(((alignedPct / 100) * 5).toFixed(1)), 0, 5);
        scores.push({
            parameter: def.parameter,
            score: alignedScore,
            alignmentPct: alignedPct,
            deviationPct: 100 - alignedPct,
            summary: evaluation.summary
        });
        evidence.push(...evaluation.evidence, ...designSystemAugment.evidence);
        issues.push(...evaluation.issues, ...designSystemAugment.issues);
    }
    const overallAlignmentPct = Math.round(scores.reduce((sum, s) => sum + s.alignmentPct, 0) / scores.length);
    const strategicInputs = deriveStrategicInputs(scores, bundle.strategicContext);
    const strategicBranch = evaluateStrategicBranch({
        ...strategicInputs,
        inputSource: strategicInputs.inputSource
    });
    return {
        scores,
        evidence,
        issues,
        overallAlignmentPct,
        overallDeviationPct: 100 - overallAlignmentPct,
        strategicBranch
    };
};
//# sourceMappingURL=engine.js.map