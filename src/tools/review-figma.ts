import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';

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
  description: 'Phase 1 remote tool registration for Figma review.',
  annotations: {
    title: 'Review Figma',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false
  }
};

export default async function reviewFigmaTool(args: InferSchema<typeof schema>) {
  return [
    '# review_figma (Phase 1)',
    '',
    'Tool is registered and available remotely.',
    'Full review pipeline execution is being migrated in a serverless-safe follow-up.',
    '',
    'Received input:',
    '```json',
    JSON.stringify(args, null, 2),
    '```'
  ].join('\n');
}