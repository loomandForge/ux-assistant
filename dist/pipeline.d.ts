import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { DeterministicReviewResult } from '@ux-assistant/scoring';
import { ReviewStorage } from './storage.js';
import { LlmProviderMetadata } from './llm.js';
import { ReviewInputRequest, ReviewInputType } from './input-detect.js';
import { ReviewDetailPayload } from './detail.js';
import { ReviewStage } from './stages.js';
export interface ReviewResult {
    runId: number;
    inputType: ReviewInputType;
    source: string;
    reportMarkdownPath?: string;
    stage: ReviewStage;
    stageMessage: string;
    overallAlignmentPct: number;
    executiveSummary: string;
    topRisksNarrative: string[];
    llmProvider: LlmProviderMetadata;
    strategicContractVersion?: string;
    strategicBranch?: DeterministicReviewResult['strategicBranch'];
    strategicArtifacts?: ReviewDetailPayload['strategicArtifacts'];
    scores: Array<{
        parameter: string;
        alignmentPct: number;
        score: number;
    }>;
    topIssues: Array<{
        title: string;
        severity: string;
        parameter: string;
    }>;
}
export type ProgressCallback = (stage: ReviewStage, progress: number, total: number) => void;
export declare function reviewInput(request: ReviewInputRequest, storage: ReviewStorage, debug?: boolean, onProgress?: ProgressCallback, mcpServer?: Server): Promise<ReviewResult>;
export declare function reviewFigma(figmaUrl: string, storage: ReviewStorage, debug?: boolean, designSystemConfig?: {
    designSystem?: string;
    customGuidelinePath?: string;
    problemStatement?: string;
    proposedSolution?: string;
    requirements?: string[];
}, onProgress?: ProgressCallback, mcpServer?: Server): Promise<ReviewResult>;
