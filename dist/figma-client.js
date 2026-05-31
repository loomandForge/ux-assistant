import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
const FIGMA_MCP_URL = process.env.FIGMA_MCP_URL ?? 'http://127.0.0.1:3845/sse';
/** Tools to call on the Figma MCP to gather design data */
const FIGMA_TOOLS_TO_CALL = [
    'get_design_context',
    'get_metadata',
    'get_screenshot',
    'get_variable_defs'
];
/**
 * Connect to Figma MCP and fetch design data using available tools.
 */
export async function fetchFigmaData(options) {
    const { fileKey, nodeId, figmaUrl, debug } = options;
    const results = [];
    const client = new Client({ name: 'ux-review-figma-client', version: '0.1.0' }, { capabilities: {} });
    const transport = new SSEClientTransport(new URL(FIGMA_MCP_URL));
    try {
        await client.connect(transport);
        // Discover available tools
        const { tools } = await client.listTools();
        const availableToolNames = new Set(tools.map(t => t.name));
        if (debug) {
            console.error(`[Figma MCP] Connected. Available tools: ${[...availableToolNames].join(', ')}`);
        }
        // Call each tool that's available
        for (const toolName of FIGMA_TOOLS_TO_CALL) {
            if (!availableToolNames.has(toolName)) {
                results.push({ toolName, status: 'error', error: `Tool not available on Figma MCP` });
                continue;
            }
            try {
                const args = { figmaUrl };
                if (fileKey)
                    args.fileKey = fileKey;
                if (nodeId)
                    args.nodeId = nodeId;
                const response = await client.callTool({ name: toolName, arguments: args });
                results.push({
                    toolName,
                    status: 'success',
                    data: response.content
                });
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                results.push({ toolName, status: 'error', error: msg });
                if (debug)
                    console.error(`[Figma MCP] ${toolName} failed: ${msg}`);
            }
        }
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        // Connection failed — return errors for all tools
        for (const toolName of FIGMA_TOOLS_TO_CALL) {
            results.push({
                toolName,
                status: 'error',
                error: `Figma MCP connection failed: ${msg}`
            });
        }
    }
    finally {
        try {
            await client.close();
        }
        catch {
            /* ignore */
        }
    }
    return results;
}
