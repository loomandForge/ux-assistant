import { DeterministicReviewResult } from '@ux-assistant/scoring';
import { LlmNarrative } from './llm.js';
import { StrategicArtifactsContract } from './contract.js';
export interface UiScoreIndicator {
    parameter: string;
    alignmentPct: number;
    deviationPct: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    badge: string;
}
export interface DetailSection {
    parameter: string;
    score: number;
    alignmentPct: number;
    deviationPct: number;
    summary: string;
    narrative?: string;
    evidence: Array<{
        label: string;
        detail: string;
        confidence: string;
    }>;
    issues: Array<{
        severity: string;
        title: string;
        evidence: string;
        recommendation: string;
    }>;
}
export interface ReviewDetailPayload {
    runId: number;
    source: string;
    status: string;
    stage: string;
    stageMessage: string;
    createdAt: string;
    overallAlignmentPct: number;
    strategicContractVersion?: string;
    strategicBranch?: {
        branch: 'improvement' | 'persuasion' | 'dual';
        branchCompositePct: number;
        problemSolutionFitPct: number;
        requirementTraceabilityPct: number;
        confidenceCaution: boolean;
        inputSource: 'explicit' | 'derived-proxy';
        notes: string[];
    };
    strategicArtifacts?: StrategicArtifactsContract;
    executiveSummary?: string;
    topRisks?: string[];
    scoreIndicators: UiScoreIndicator[];
    sections: DetailSection[];
}
export declare const buildStrategicArtifacts: (scoring: DeterministicReviewResult, narrative?: LlmNarrative) => StrategicArtifactsContract;
export declare const buildReviewDetailPayload: (options: {
    runId: number;
    source: string;
    status: string;
    stage: string;
    stageMessage: string;
    createdAt: string;
    scoring: DeterministicReviewResult;
    narrative?: LlmNarrative;
}) => ReviewDetailPayload;
