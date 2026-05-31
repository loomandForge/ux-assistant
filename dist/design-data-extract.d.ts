/**
 * Design Data Extraction Module
 *
 * Extracts meaningful design signals from raw MCP tool call results
 * (component names, text content, layout info, colors, etc.) so the
 * LLM can reason about the actual design — not just tool success/failure.
 */
import { ToolCallResult } from '@ux-assistant/scoring';
export interface ExtractedDesignData {
    /** Component/layer names found in the design */
    components: string[];
    /** Text content / labels visible in the design */
    textContent: string[];
    /** Frame/page names showing navigation structure */
    frameNames: string[];
    /** Color values used */
    colors: string[];
    /** Typography info (font families, sizes) */
    typography: string[];
    /** Layout info (auto-layout, constraints, dimensions) */
    layout: string[];
    /** Interaction annotations (prototyping, hover states) */
    interactions: string[];
    /** Design tokens / variables */
    tokens: string[];
    /** Raw node hierarchy summary */
    hierarchy: string[];
    /** Screenshot path if available */
    screenshotPath?: string;
    /** Source metadata */
    sourceType: 'figma' | 'web' | 'html' | 'image';
}
/**
 * Extract design signals from the raw data field of MCP tool call results.
 */
export declare function extractDesignData(toolCalls: ToolCallResult[], sourceType?: 'figma' | 'web' | 'html' | 'image'): ExtractedDesignData;
/**
 * Format extracted design data into a concise string for LLM consumption.
 * Keeps under ~2000 chars to avoid prompt bloat.
 */
export declare function formatDesignDataForPrompt(data: ExtractedDesignData): string;
/**
 * Compute confidence metrics from evidence data.
 */
export declare function computeConfidenceMetrics(evidence: Array<{
    confidence: string;
}>): {
    observedPct: number;
    assumedPct: number;
    unknownPct: number;
    level: 'HIGH' | 'MODERATE' | 'LOW';
    limitations: string[];
};
