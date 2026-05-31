import type { ReviewEvidence } from '@ux-assistant/scoring';
export interface DesignSystemEvidence {
    componentFindings: Array<{
        componentName: string;
        matchScore: number;
        category: string;
        description: string;
        evidence: ReviewEvidence;
    }>;
    iconFindings: Array<{
        iconName: string;
        tags: string[];
        evidence: ReviewEvidence;
    }>;
    queriesRun: number;
    queriesFailed: number;
}
/**
 * Query a design system MCP for compliance findings and convert to scoring evidence.
 */
export declare const buildDesignSystemEvidence: (nodeDescription?: string, figmaNodeName?: string, enableDebug?: boolean) => Promise<DesignSystemEvidence>;
