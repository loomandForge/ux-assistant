#!/usr/bin/env node

import { runDeterministicScoring } from './dist/engine.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'scoring-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);
let closing = false;

const shutdown = async () => {
  if (closing) return;
  closing = true;
  try {
    await server.close();
  } catch {
    // Ignore shutdown failures.
  }
  process.exit(0);
};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'run_deterministic_scoring',
      description:
        'Run the deterministic UX scoring engine on a scoring bundle and return detailed parameter scores, evidence, and issues.',
      inputSchema: {
        type: 'object',
        properties: {
          figmaUrl: { type: 'string' },
          fileKey: { type: ['string', 'null'] },
          nodeId: { type: ['string', 'null'] },
          toolCalls: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                toolName: { type: 'string' },
                status: { type: 'string', enum: ['success', 'error'] },
                data: {},
                error: { type: 'string' }
              },
              required: ['toolName', 'status']
            }
          },
          strategicContext: { type: 'object' },
          designSystemFindings: { type: 'object' }
        },
        required: ['figmaUrl', 'toolCalls']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  if (name !== 'run_deterministic_scoring') {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }

  try {
    const figmaUrl = typeof args?.figmaUrl === 'string' ? args.figmaUrl : '';
    const toolCalls = Array.isArray(args?.toolCalls) ? args.toolCalls : [];

    if (!figmaUrl) {
      return { content: [{ type: 'text', text: 'Error: figmaUrl is required' }] };
    }

    if (toolCalls.length === 0) {
      return { content: [{ type: 'text', text: 'Error: toolCalls must be a non-empty array' }] };
    }

    const bundle = {
      figmaUrl,
      fileKey: typeof args?.fileKey === 'string' ? args.fileKey : null,
      nodeId: typeof args?.nodeId === 'string' ? args.nodeId : null,
      toolCalls,
      strategicContext:
        typeof args?.strategicContext === 'object' ? args.strategicContext : undefined,
      designSystemFindings:
        typeof args?.designSystemFindings === 'object' ? args.designSystemFindings : undefined
    };

    const result = runDeterministicScoring(bundle);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Error: ${message}` }] };
  }
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await server.connect(new StdioServerTransport());
