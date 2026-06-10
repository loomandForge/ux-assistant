import type { FigmaEvidenceInput, ReviewInputRequest } from './input-detect.js';
import { type PerspectiveMode } from './llm.js';
export declare function runRemotePerspective(args: {
    runId: number;
    mode: Exclude<PerspectiveMode, 'review'>;
    prdText?: string;
    problemStatement?: string;
    requirements?: string[];
    audience?: string;
    businessGoal?: string;
    designDecisions?: string[];
    constraints?: string[];
    alternativesConsidered?: string[];
    userResearch?: string;
}): Promise<string>;
export declare function runRemoteFigmaReview(args: {
    figmaUrl: string;
    figmaEvidence?: FigmaEvidenceInput;
    designSystem?: string;
    customGuidelinePath?: string;
    problemStatement?: string;
    proposedSolution?: string;
    requirements?: string[];
}): Promise<string>;
export declare function runRemoteInputReview(args: ReviewInputRequest): Promise<string>;
