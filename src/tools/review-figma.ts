import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';
import { runRemoteFigmaReview } from './remote-review.js';

export const schema = {
  figmaUrl: z.string().describe('Full Figma URL to review'),
  figmaEvidence: z
    .object({
      designContext: z.unknown().optional(),
      metadata: z.unknown().optional(),
      screenshot: z.unknown().optional(),
      variables: z.unknown().optional(),
      variableDefs: z.unknown().optional(),
      toolCalls: z
        .array(
          z.object({
            toolName: z.string().optional(),
            name: z.string().optional(),
            status: z.enum(['success', 'error']).optional(),
            data: z.unknown().optional(),
            content: z.unknown().optional(),
            error: z.string().optional()
          })
        )
        .optional()
    })
    .optional()
    .describe('Optional evidence fetched by the host from Figma MCP before calling UX Assistant'),
  designSystem: z
    .enum(['generic', 'external', 'custom', 'none'])
    .optional()
    .describe('Design system mode (default: generic)'),
  customGuidelinePath: z.string().optional().describe('Path to custom guideline file'),
  problemStatement: z.string().optional(),
  proposedSolution: z.string().optional(),
  requirements: z.array(z.string()).optional()
};

export const metadata: ToolMetadata = {
  name: 'review_figma',
  description: 'Run the UX review pipeline for a Figma URL and return a markdown report.',
  annotations: {
    title: 'Review Figma',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false
  }
};

export default async function reviewFigmaTool(args: InferSchema<typeof schema>) {
  return runRemoteFigmaReview(args);
}
