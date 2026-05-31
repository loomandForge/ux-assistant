import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ScoringBundle } from '@ux-assistant/scoring';
import { GatheredContext } from '../context-gather.js';
import { ReviewStorage } from '../storage.js';
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
export declare const ingestFigmaInput: (options: IngestFigmaInputOptions) => Promise<IngestedFigmaPayload>;
export {};
