import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ScoringBundle } from '@ux-assistant/scoring';
import { GatheredContext } from '../context-gather.js';
import type { ReviewStorage } from '../storage.js';
import type { FigmaEvidenceInput } from '../input-detect.js';
type IngestFigmaInputOptions = {
    figmaUrl: string;
    runId: number;
    storage: ReviewStorage;
    strategicContext: ScoringBundle['strategicContext'];
    debug?: boolean;
    mcpServer?: Server;
};
export type IngestedFigmaPayload = {
    source: string;
    bundle: ScoringBundle;
    gatheredContext?: GatheredContext;
};
export declare const hasFigmaEvidence: (evidence: FigmaEvidenceInput | undefined) => boolean;
export declare const ingestFigmaEvidenceInput: (options: Omit<IngestFigmaInputOptions, "debug" | "mcpServer"> & {
    figmaEvidence: FigmaEvidenceInput;
}) => IngestedFigmaPayload;
export declare const ingestFigmaInput: (options: IngestFigmaInputOptions) => Promise<IngestedFigmaPayload>;
export {};
