import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';

export const schema = {
  runId: z.number().int().positive().describe('Review run ID from review_figma or review_input'),
  prdText: z.string().optional().describe('Optional PRD text for challenge context')
};

export const metadata: ToolMetadata = {
  name: 'challenge_design',
  description: 'Challenge the design from a problem-solution-requirement perspective.',
  annotations: {
    title: 'Challenge Design',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false
  }
};

export default async function challengeDesignTool({ runId, prdText }: InferSchema<typeof schema>) {
  return [
    '# challenge_design (Phase 1)',
    '',
    `runId: ${runId}`,
    prdText ? `prdText provided: yes` : 'prdText provided: no',
    '',
    'Tool is registered and ready for remote invocation.',
    'Perspective generation will be wired in the serverless-safe phase 2 migration.'
  ].join('\n');
}