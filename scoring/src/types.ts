/**
 * ScoringBundle — abstraction over the raw MCP tool call data.
 * The scoring engine operates on this interface rather than any
 * specific storage or MCP response format.
 */

export interface ToolCallResult {
  toolName: string;
  status: 'success' | 'error';
  data?: unknown;
  error?: string;
}

export interface StrategicReviewContext {
  problemStatement?: string;
  proposedSolution?: string;
  requirements?: string[];
}

export interface ScoringBundle {
  figmaUrl: string;
  fileKey: string | null;
  nodeId: string | null;
  toolCalls: ToolCallResult[];
  strategicContext?: StrategicReviewContext;
  designSystemFindings?: {
    mode: 'generic' | 'external' | 'custom' | 'none';
    componentFindings: Array<{
      componentName: string;
      matchScore: number;
      category: string;
      description: string;
    }>;
    iconFindings: Array<{
      iconName: string;
      tags: string[];
    }>;
    queriesRun: number;
    queriesFailed: number;
  };
}
