import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';
import { runRemoteFigmaReview } from './remote-review.js';

export const schema = {
  figmaUrl: z.string().describe('Full Figma URL to review'),
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
