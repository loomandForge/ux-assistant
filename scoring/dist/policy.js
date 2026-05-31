export const DEFAULT_BRANCH_POLICY_THRESHOLDS = {
    fitWeight: 0.55,
    traceabilityWeight: 0.45,
    weakCompositeLt: 70,
    weakDimensionLt: 65,
    strongCompositeGte: 82,
    strongDimensionGte: 80
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const STOP_WORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'in',
    'is',
    'it',
    'of',
    'on',
    'or',
    'that',
    'the',
    'to',
    'was',
    'were',
    'will',
    'with',
    'this',
    'these',
    'those',
    'we',
    'you',
    'your'
]);
const tokenize = (value) => {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map(token => token.trim())
        .filter(token => token.length >= 3 && !STOP_WORDS.has(token));
};
const tokenSet = (value) => new Set(tokenize(value));
const overlapPct = (source, target) => {
    if (source.size === 0) {
        return 0;
    }
    let hits = 0;
    Array.from(source).forEach(token => {
        if (target.has(token)) {
            hits += 1;
        }
    });
    return Math.round((hits / source.size) * 100);
};
const scoreByParameter = (scores) => {
    return new Map(scores.map(score => [score.parameter, score]));
};
/**
 * Temporary deterministic proxy until dedicated Phase 8 dimensions are implemented.
 * - problemSolutionFitPct      -> user_flow_interaction alignment
 * - requirementTraceabilityPct -> content_information_architecture alignment
 */
export const deriveStrategicInputsFromScores = (scores) => {
    const byParam = scoreByParameter(scores);
    const fit = byParam.get('user_flow_interaction')?.alignmentPct ?? 0;
    const traceability = byParam.get('content_information_architecture')?.alignmentPct ?? 0;
    return {
        problemSolutionFitPct: clamp(Math.round(fit), 0, 100),
        requirementTraceabilityPct: clamp(Math.round(traceability), 0, 100),
        notes: [
            'Phase 8 proxy mapping active: problemSolutionFit uses user_flow_interaction alignment.',
            'Phase 8 proxy mapping active: requirementTraceability uses content_information_architecture alignment.'
        ]
    };
};
export const deriveStrategicInputs = (scores, strategicContext) => {
    const problem = strategicContext?.problemStatement?.trim() ?? '';
    const solution = strategicContext?.proposedSolution?.trim() ?? '';
    const requirements = (strategicContext?.requirements ?? [])
        .map(req => req.trim())
        .filter(Boolean);
    if (!problem || !solution || requirements.length === 0) {
        const proxy = deriveStrategicInputsFromScores(scores);
        return {
            ...proxy,
            inputSource: 'derived-proxy',
            notes: [
                ...proxy.notes,
                'Explicit strategic context missing (problemStatement, proposedSolution, requirements).'
            ]
        };
    }
    const problemTokens = tokenSet(problem);
    const solutionTokens = tokenSet(solution);
    const problemSolutionFitPct = clamp(overlapPct(problemTokens, solutionTokens), 0, 100);
    const requirementCoverage = requirements.map(req => {
        const requirementTokens = tokenSet(req);
        return overlapPct(requirementTokens, solutionTokens);
    });
    const coveredRequirements = requirementCoverage.filter(pct => pct >= 35).length;
    const requirementTraceabilityPct = clamp(Math.round((coveredRequirements / requirements.length) * 100), 0, 100);
    return {
        problemSolutionFitPct,
        requirementTraceabilityPct,
        inputSource: 'explicit',
        notes: [
            `Fit score derived from deterministic token overlap between problem and solution (${problemTokens.size} problem tokens).`,
            `Traceability score derived from requirement coverage threshold (>=35% token overlap): ${coveredRequirements}/${requirements.length} requirements covered.`
        ]
    };
};
export const evaluateStrategicBranch = (input) => {
    const thresholds = input.thresholds ?? DEFAULT_BRANCH_POLICY_THRESHOLDS;
    const problemSolutionFitPct = clamp(Math.round(input.problemSolutionFitPct), 0, 100);
    const requirementTraceabilityPct = clamp(Math.round(input.requirementTraceabilityPct), 0, 100);
    const branchCompositePct = clamp(Math.round(thresholds.fitWeight * problemSolutionFitPct +
        thresholds.traceabilityWeight * requirementTraceabilityPct), 0, 100);
    const isWeak = branchCompositePct < thresholds.weakCompositeLt ||
        problemSolutionFitPct < thresholds.weakDimensionLt ||
        requirementTraceabilityPct < thresholds.weakDimensionLt;
    const isStrong = branchCompositePct >= thresholds.strongCompositeGte &&
        problemSolutionFitPct >= thresholds.strongDimensionGte &&
        requirementTraceabilityPct >= thresholds.strongDimensionGte;
    let branch = 'dual';
    if (isWeak) {
        branch = 'improvement';
    }
    else if (isStrong) {
        branch = 'persuasion';
    }
    const confidenceCaution = branch === 'dual';
    return {
        branch,
        branchCompositePct,
        problemSolutionFitPct,
        requirementTraceabilityPct,
        confidenceCaution,
        inputSource: input.inputSource ?? 'explicit',
        notes: input.notes ?? []
    };
};
//# sourceMappingURL=policy.js.map