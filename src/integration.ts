/**
 * MCP Server registration config for agent integration.
 *
 * To integrate with your MCP host, add this entry to your MCP server registry config:
 *
 * ```typescript
 * 'ux-review': {
 *   command: getRuntimeCommand(),
 *   args: [path.resolve(__dirname, '../../packages/ux-review-mcp/dist/cli.js')],
 *   env: {
 *     FIGMA_MCP_URL: process.env.FIGMA_MCP_URL ?? 'http://127.0.0.1:3845/sse',
 *     UX_REVIEW_DATA_DIR: path.join(os.homedir(), '.ux-review')
 *   },
 *   trust: true,
 *   description: 'UX design review — scores Figma designs across 7 quality parameters'
 * }
 * ```
 *
 * The server will be spawned via stdio when the agent starts and tools will be
 * available to the opencode agent as `review_figma` and `get_review_report`.
 */

export interface UxReviewMcpConfig {
  command: string;
  args: string[];
  env: {
    FIGMA_MCP_URL?: string;
    UX_REVIEW_DATA_DIR?: string;
  };
  trust: boolean;
  description: string;
}
