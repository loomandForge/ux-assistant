import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ScoringBundle } from '@ux-assistant/scoring';
import { parseFigmaUrl } from '../figma-url.js';
import { fetchFigmaData } from '../figma-client.js';
import { gatherContextWithTools, GatheredContext } from '../context-gather.js';
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

export const ingestFigmaInput = async (
  options: IngestFigmaInputOptions
): Promise<IngestedFigmaPayload> => {
  const { figmaUrl, runId, storage, strategicContext, debug = false, mcpServer } = options;
  const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);

  const toolResults = await fetchFigmaData({
    fileKey,
    nodeId,
    figmaUrl,
    debug
  });

  for (const tc of toolResults) {
    storage.addToolCall(runId, tc.toolName, tc.status, tc.data, tc.error);
  }

  let gatheredContext: GatheredContext | undefined;
  if (mcpServer) {
    try {
      gatheredContext = await gatherContextWithTools(mcpServer, {
        designRef: figmaUrl,
        contextTypes: ['accessibility', 'design-system', 'user-flows'],
        debug
      });

      if (gatheredContext.samplingUsed) {
        storage.addToolCall(runId, 'gather_context_sampling', 'success', {
          findings: gatheredContext.findings.length,
          components: gatheredContext.componentReferences.length,
          accessibility: gatheredContext.accessibilityNotes.length
        });
      }
    } catch (error) {
      if (debug) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[Pipeline] context gathering failed (non-fatal): ${msg}`);
      }
    }
  }

  const bundle: ScoringBundle = {
    figmaUrl,
    fileKey,
    nodeId,
    toolCalls: toolResults,
    strategicContext
  };

  if (gatheredContext?.samplingUsed && gatheredContext.findings.length > 0) {
    bundle.toolCalls.push({
      toolName: 'gathered_context',
      status: 'success',
      data: {
        findings: gatheredContext.findings,
        componentReferences: gatheredContext.componentReferences,
        accessibilityNotes: gatheredContext.accessibilityNotes,
        additionalContext: gatheredContext.additionalContext
      }
    });
  }

  return {
    source: figmaUrl,
    bundle,
    gatheredContext
  };
};
