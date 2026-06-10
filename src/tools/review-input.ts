import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';
import { runRemoteInputReview } from '../remote-review.js';

export const schema = {
  figmaUrl: z.string().optional().describe('Figma URL to review'),
  webUrl: z.string().optional().describe('Live web URL to capture and review'),
  imagePath: z.string().optional().describe('Absolute path to an image file to review'),
  htmlSnippet: z.string().optional().describe('HTML markup to render and review'),
  chatContext: z.string().optional().describe('Recent chat text used for auto-detect'),
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
  name: 'review_input',
  description:
    'Run the UX review pipeline for Figma, webpage, image, HTML, or chat-detected input.',
  annotations: {
    title: 'Review Input',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false
  }
};

export default async function reviewInputTool(args: InferSchema<typeof schema>) {
  return runRemoteInputReview(args);
}
