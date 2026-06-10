import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';
import { runRemotePerspective } from '../remote-review.js';

export const schema = {
  runId: z.number().int().positive().describe('Review run ID from review_figma or review_input'),
  problemStatement: z.string().optional().describe('Optional explicit problem statement'),
  requirements: z.array(z.string()).optional().describe('Optional requirements list')
};

export const metadata: ToolMetadata = {
  name: 'improve_design',
  description: 'Provide concrete design improvements based on an existing review run.',
  annotations: {
    title: 'Improve Design',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false
  }
};

export default async function improveDesignTool({ runId, problemStatement, requirements }: InferSchema<typeof schema>) {
  return runRemotePerspective({
    runId,
    mode: 'improve',
    problemStatement,
    requirements
  });
}
