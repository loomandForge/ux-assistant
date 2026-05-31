import { ReviewParameterKey } from './schema.js';
export interface GuidelineParameterDefinition {
    key: ReviewParameterKey;
    title: string;
    rawText: string;
}
/**
 * Parse a design review guideline markdown file and extract parameter definitions.
 */
export declare const loadGuidelineParameters: (guidelinePath: string) => Promise<GuidelineParameterDefinition[]>;
//# sourceMappingURL=guideline.d.ts.map