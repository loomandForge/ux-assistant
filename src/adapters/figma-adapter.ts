import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ScoringBundle, ToolCallResult } from '@ux-assistant/scoring';
import { parseFigmaUrl } from '../figma-url.js';
import { fetchFigmaData } from '../figma-client.js';
import { gatherContextWithTools, GatheredContext } from '../context-gather.js';
import type { ReviewStorage } from '../storage.js';
import type { FigmaEvidenceInput, FigmaEvidenceToolCall } from '../input-detect.js';

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

const TOOL_NAME_ALIASES: Record<string, string> = {
  designContext: 'get_design_context',
  getDesignContext: 'get_design_context',
  metadata: 'get_metadata',
  getMetadata: 'get_metadata',
  screenshot: 'get_screenshot',
  getScreenshot: 'get_screenshot',
  variables: 'get_variable_defs',
  variableDefs: 'get_variable_defs',
  getVariables: 'get_variable_defs',
  get_variable_defs: 'get_variable_defs',
  get_design_context: 'get_design_context',
  get_metadata: 'get_metadata',
  get_screenshot: 'get_screenshot'
};

const normalizeToolName = (name: string | undefined): string | undefined => {
  if (!name) return undefined;
  return TOOL_NAME_ALIASES[name] ?? name;
};

const normalizeEvidenceToolCall = (toolCall: FigmaEvidenceToolCall): ToolCallResult | undefined => {
  const toolName = normalizeToolName(toolCall.toolName ?? toolCall.name);
  if (!toolName) return undefined;

  const status = toolCall.status === 'error' ? 'error' : 'success';
  return {
    toolName,
    status,
    data: toolCall.data ?? toolCall.content,
    error: toolCall.error
  };
};

const evidenceToToolCalls = (evidence: FigmaEvidenceInput): ToolCallResult[] => {
  const toolCalls: ToolCallResult[] = [];

  const pushEvidence = (toolName: string, data: unknown) => {
    if (data !== undefined && data !== null) {
      toolCalls.push({ toolName, status: 'success', data });
    }
  };

  pushEvidence('get_design_context', evidence.designContext);
  pushEvidence('get_metadata', evidence.metadata);
  pushEvidence('get_screenshot', evidence.screenshot);
  pushEvidence('get_variable_defs', evidence.variableDefs ?? evidence.variables);

  if (Array.isArray(evidence.toolCalls)) {
    for (const toolCall of evidence.toolCalls) {
      const normalized = normalizeEvidenceToolCall(toolCall);
      if (normalized) toolCalls.push(normalized);
    }
  }

  const byToolName = new Map<string, ToolCallResult>();
  for (const toolCall of toolCalls) {
    if (!byToolName.has(toolCall.toolName) || toolCall.status === 'success') {
      byToolName.set(toolCall.toolName, toolCall);
    }
  }

  return [...byToolName.values()];
};

export const hasFigmaEvidence = (evidence: FigmaEvidenceInput | undefined): boolean => {
  if (!evidence) return false;
  return evidenceToToolCalls(evidence).length > 0;
};

export const ingestFigmaEvidenceInput = (
  options: Omit<IngestFigmaInputOptions, 'debug' | 'mcpServer'> & {
    figmaEvidence: FigmaEvidenceInput;
  }
): IngestedFigmaPayload => {
  const { figmaUrl, runId, storage, strategicContext, figmaEvidence } = options;
  const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);
  const toolResults = evidenceToToolCalls(figmaEvidence);

  for (const tc of toolResults) {
    storage.addToolCall(runId, tc.toolName, tc.status, tc.data, tc.error);
  }

  storage.addToolCall(runId, 'ingest_figma_evidence', 'success', {
    providedToolCalls: toolResults.length,
    tools: toolResults.map(tc => tc.toolName)
  });

  return {
    source: figmaUrl,
    bundle: {
      figmaUrl,
      fileKey,
      nodeId,
      toolCalls: toolResults,
      strategicContext
    }
  };
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
