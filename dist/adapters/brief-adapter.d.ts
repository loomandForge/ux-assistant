import type { ScoringBundle } from '@ux-assistant/scoring';
import type { ReviewInputRequest } from '../input-detect.js';
export interface BriefIngestionResult {
    strategicContext: ScoringBundle['strategicContext'];
    summary: {
        hasProblemStatement: boolean;
        hasProposedSolution: boolean;
        requirementsCount: number;
    };
}
export declare const ingestBriefContext: (request: Pick<ReviewInputRequest, "problemStatement" | "proposedSolution" | "requirements">) => BriefIngestionResult;
