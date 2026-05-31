import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';

export const schema = {
  figmaUrl: z.string().optional().describe('Figma URL to review'),
  webUrl: z.string().optional().describe('Live web URL to capture and review'),
  imagePath: z.string().optional().describe('Absolute path to an image file to review'),
  htmlSnippet: z.string().optional().describe('HTML markup to render and review'),
  chatContext: z.string().optional().describe('Recent chat text used for auto-detect'),
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
    'Phase 1 remote tool registration for review input. Accepts review fields and returns migration guidance.',
  annotations: {
    title: 'Review Input',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false
  }
};

export default async function reviewInputTool(args: InferSchema<typeof schema>) {
  return [
    '# review_input (Phase 1)',
    '',
    'This tool is now registered for remote discovery.',
    'The full scoring pipeline migration is being completed separately for serverless compatibility.',
    '',
    'Received input:',
    '```json',
    JSON.stringify(args, null, 2),
    '```'
  ].join('\n');
}