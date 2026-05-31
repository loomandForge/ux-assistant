/**
 * Context gathering via MCP sampling.
 *
 * Uses the host client's LLM (via server.createMessage) to call other MCP tools
 * available in the app and gather additional design context for the review.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
export interface GatheredContext {
    /** Raw text returned by the sampling LLM */
    rawResponse: string;
    /** Structured findings extracted from the response */
    findings: string[];
    /** Any component/pattern references found */
    componentReferences: string[];
    /** Accessibility notes gathered */
    accessibilityNotes: string[];
    /** Additional context that couldn't be classified */
    additionalContext: string[];
    /** Whether sampling was available and used */
    samplingUsed: boolean;
}
export interface GatherContextOptions {
    /** The Figma URL or design reference */
    designRef: string;
    /** What kind of additional context to gather */
    contextTypes: Array<'accessibility' | 'design-system' | 'user-flows' | 'content' | 'technical'>;
    /** Additional hints for the gathering LLM */
    hints?: string;
    /** Max tokens for the sampling response */
    maxTokens?: number;
    /** Debug logging */
    debug?: boolean;
}
/**
 * Check if the connected client supports sampling (createMessage).
 */
export declare function clientSupportsSampling(server: Server): boolean;
/**
 * Check if the connected client supports tools in sampling requests.
 */
export declare function clientSupportsToolsInSampling(server: Server): boolean;
/**
 * Gather additional design context by asking the host LLM to use available tools.
 * Falls back gracefully if sampling is not supported by the client.
 */
export declare function gatherContext(server: Server, options: GatherContextOptions): Promise<GatheredContext>;
/**
 * Gather context with tools — asks the host LLM to actively use other MCP tools.
 * Only works if the client supports tools in sampling.
 */
export declare function gatherContextWithTools(server: Server, options: GatherContextOptions): Promise<GatheredContext>;
