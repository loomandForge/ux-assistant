import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';
import { runRemotePerspective } from './remote-review.js';

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
  return runRemotePerspective({
    runId,
    mode: 'challenge',
    prdText
  });
}
