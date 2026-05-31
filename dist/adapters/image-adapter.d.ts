import type { ScoringBundle } from '@ux-assistant/scoring';
import { ReviewStorage } from '../storage.js';
type IngestVisualOptions = {
    runId: number;
    storage: ReviewStorage;
    strategicContext: ScoringBundle['strategicContext'];
};
export type IngestedVisualPayload = {
    source: string;
    bundle: ScoringBundle;
};
export declare const ingestWebInput: (webUrl: string, options: IngestVisualOptions) => Promise<IngestedVisualPayload>;
export declare const ingestHtmlInput: (htmlSnippet: string, options: IngestVisualOptions) => Promise<IngestedVisualPayload>;
export declare const ingestImagePathInput: (imagePath: string, options: IngestVisualOptions) => IngestedVisualPayload;
export {};
