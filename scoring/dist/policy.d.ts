import { ParameterScore } from './schema.js';
import { StrategicReviewContext } from './types.js';
export type StrategicBranch = 'improvement' | 'persuasion' | 'dual';
export interface BranchPolicyThresholds {
    fitWeight: number;
    traceabilityWeight: number;
    weakCompositeLt: number;
    weakDimensionLt: number;
    strongCompositeGte: number;
    strongDimensionGte: number;
}
export interface StrategicBranchEvaluation {
    branch: StrategicBranch;
    branchCompositePct: number;
    problemSolutionFitPct: number;
    requirementTraceabilityPct: number;
    confidenceCaution: boolean;
    inputSource: 'explicit' | 'derived-proxy';
    notes: string[];
}
export declare const DEFAULT_BRANCH_POLICY_THRESHOLDS: BranchPolicyThresholds;
/**
 * Temporary deterministic proxy until dedicated Phase 8 dimensions are implemented.
 * - problemSolutionFitPct      -> user_flow_interaction alignment
 * - requirementTraceabilityPct -> content_information_architecture alignment
 */
export declare const deriveStrategicInputsFromScores: (scores: ParameterScore[]) => {
    problemSolutionFitPct: number;
    requirementTraceabilityPct: number;
    notes: string[];
};
export declare const deriveStrategicInputs: (scores: ParameterScore[], strategicContext?: StrategicReviewContext) => {
    problemSolutionFitPct: number;
    requirementTraceabilityPct: number;
    inputSource: "explicit" | "derived-proxy";
    notes: string[];
};
export declare const evaluateStrategicBranch: (input: {
    problemSolutionFitPct: number;
    requirementTraceabilityPct: number;
    thresholds?: BranchPolicyThresholds;
    inputSource?: "explicit" | "derived-proxy";
    notes?: string[];
}) => StrategicBranchEvaluation;
//# sourceMappingURL=policy.d.ts.map