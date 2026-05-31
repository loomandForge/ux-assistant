import { ToolCallResult } from '@ux-assistant/scoring';
export interface FigmaFetchOptions {
    fileKey: string;
    nodeId: string | null;
    figmaUrl: string;
    debug?: boolean;
}
/**
 * Connect to Figma MCP and fetch design data using available tools.
 */
export declare function fetchFigmaData(options: FigmaFetchOptions): Promise<ToolCallResult[]>;
