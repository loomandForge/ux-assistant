import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
const DESIGN_SYSTEM_MCP_URL = process.env.UX_REVIEW_DESIGN_SYSTEM_MCP_URL ??
    process.env.ELEMENT_MCP_URL ??
    'http://127.0.0.1:3846/sse';
const DESIGN_SYSTEM_COMPONENT_SEARCH_TOOL = process.env.UX_REVIEW_DESIGN_SYSTEM_COMPONENT_TOOL ?? 'element-search';
const DESIGN_SYSTEM_ICON_SEARCH_TOOL = process.env.UX_REVIEW_DESIGN_SYSTEM_ICON_TOOL ?? 'element-icon-search';
const TIMEOUT_MS = 8000;
const withTimeout = (promise, label) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), TIMEOUT_MS))
]);
const extractTextPayloads = (result) => {
    const typed = result;
    if (!typed || !Array.isArray(typed.content)) {
        return [];
    }
    return typed.content
        .filter((item) => item.type === 'text' && typeof item.text === 'string')
        .map(item => item.text);
};
const parseSearchResults = (response) => extractTextPayloads(response)
    .map(text => {
    try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [parsed];
    }
    catch {
        return [];
    }
})
    .flat();
/**
 * Search for component definitions in an external design system via MCP.
 */
export const searchDesignSystemComponents = async (query, debug = false) => {
    const client = new Client({ name: 'ux-review-design-system-client', version: '0.1.0' }, { capabilities: {} });
    const transport = new SSEClientTransport(new URL(DESIGN_SYSTEM_MCP_URL));
    try {
        await withTimeout(client.connect(transport), 'Design system MCP connection');
        const response = await withTimeout(client.callTool({
            name: DESIGN_SYSTEM_COMPONENT_SEARCH_TOOL,
            arguments: { query }
        }), 'Design system component search');
        const results = parseSearchResults(response);
        return results;
    }
    catch (error) {
        if (debug) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[Design System MCP] component search failed: ${msg}`);
        }
        return [];
    }
    finally {
        try {
            await client.close();
        }
        catch {
            /* ignore */
        }
    }
};
/**
 * Search for icons in an external design system via MCP.
 */
export const searchDesignSystemIcons = async (query, debug = false) => {
    const client = new Client({ name: 'ux-review-design-system-client', version: '0.1.0' }, { capabilities: {} });
    const transport = new SSEClientTransport(new URL(DESIGN_SYSTEM_MCP_URL));
    try {
        await withTimeout(client.connect(transport), 'Design system MCP connection');
        const response = await withTimeout(client.callTool({
            name: DESIGN_SYSTEM_ICON_SEARCH_TOOL,
            arguments: { query }
        }), 'Design system icon search');
        const results = parseSearchResults(response);
        return results;
    }
    catch (error) {
        if (debug) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[Design System MCP] icon search failed: ${msg}`);
        }
        return [];
    }
    finally {
        try {
            await client.close();
        }
        catch {
            /* ignore */
        }
    }
};
export const searchElementComponents = searchDesignSystemComponents;
export const searchElementIcons = searchDesignSystemIcons;
