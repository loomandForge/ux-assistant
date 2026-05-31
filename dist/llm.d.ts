import { DeterministicReviewResult, ReviewParameterKey } from '@ux-assistant/scoring';
import { ExtractedDesignData } from './design-data-extract.js';
export interface LlmProviderMetadata {
    provider: 'ghcp' | 'glm' | 'none';
    model: string;
    fallbackUsed: boolean;
    generationTimeMs: number;
}
export interface ParameterReviewDetail {
    commentary: string;
    strengths: string[];
    issueDetails: Array<{
        problem: string;
        impact: string;
        fix: string;
    }>;
}
export interface LlmNarrative {
    executiveSummary: string;
    topRisks: string[];
    parameterCommentary: Record<ReviewParameterKey, string>;
    parameterReviews: Record<ReviewParameterKey, ParameterReviewDetail>;
    provider: LlmProviderMetadata;
}
export type PerspectiveMode = 'review' | 'challenge' | 'improve' | 'pitch';
export interface PerspectiveReportResult {
    markdown: string;
    provider: LlmProviderMetadata;
}
export interface PerspectiveContext {
    mode: PerspectiveMode;
    figmaUrl: string;
    baseReport: string;
    detail: any;
    strategicArtifacts: any;
    designSystemFindings?: any;
    designData?: ExtractedDesignData;
    knowledgeContext?: {
        userId?: string;
        projectId?: number;
        sessionId?: string;
        items?: Array<{
            knowledgeKey: string;
            category: string;
            scope: string;
            priority: string;
            confidence: string;
            summary: string;
            tags: string[];
            source?: string | null;
        }>;
        relationships?: Array<{
            fromKnowledgeKey: string;
            toKnowledgeKey: string;
            relationshipType: string;
            note?: string | null;
        }>;
    };
    memoryContext?: {
        session?: Array<{
            memoryKey: string;
            entryType: string;
            content: unknown;
            tags: string[];
        }>;
        user?: Array<{
            memoryKey: string;
            entryType: string;
            content: unknown;
            tags: string[];
        }>;
        project?: Array<{
            memoryKey: string;
            entryType: string;
            content: unknown;
            tags: string[];
        }>;
    };
    prdText?: string;
    problemStatement?: string;
    proposedSolution?: string;
    requirements?: string[];
    audience?: string;
    businessGoal?: string;
    /** Designer's own rationale for decisions (pitch mode) */
    designDecisions?: string[];
    /** Constraints that shaped the design (pitch mode) */
    constraints?: string[];
    /** Alternatives the designer considered and rejected (pitch mode) */
    alternativesConsidered?: string[];
    /** User research backing the approach (pitch mode) */
    userResearch?: string;
    /** Previous review run ID for comparison */
    previousRunId?: number;
    /** Previous review data for delta comparison */
    previousReview?: {
        overallAlignmentPct: number;
        scores: Array<{
            parameter: string;
            alignmentPct: number;
        }>;
    };
}
export declare const generateNarrative: (scoring: DeterministicReviewResult, debug?: boolean, designData?: ExtractedDesignData) => Promise<LlmNarrative>;
export declare const generatePerspectiveReport: (ctx: PerspectiveContext, debug?: boolean) => Promise<PerspectiveReportResult>;
