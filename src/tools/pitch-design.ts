import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';
import { runRemotePerspective } from './remote-review.js';

export const schema = {
  runId: z.number().int().positive().describe('Review run ID from review_figma or review_input'),
  audience: z.string().optional().describe('Target stakeholder audience for the pitch'),
  businessGoal: z.string().optional().describe('Business goal to align the pitch framing'),
  designDecisions: z.array(z.string()).optional().describe('Key design decisions and rationale'),
  constraints: z.array(z.string()).optional().describe('Technical or business constraints'),
  alternativesConsidered: z.array(z.string()).optional().describe('Alternatives considered and rejected'),
  userResearch: z.string().optional().describe('Research evidence supporting decisions')
};

export const metadata: ToolMetadata = {
  name: 'pitch_design',
  description: 'Generate stakeholder-facing pitch points from an existing review run.',
  annotations: {
    title: 'Pitch Design',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false
  }
};

export default async function pitchDesignTool({
  runId,
  audience,
  businessGoal,
  designDecisions,
  constraints,
  alternativesConsidered,
  userResearch
}: InferSchema<typeof schema>) {
  return runRemotePerspective({
    runId,
    mode: 'pitch',
    audience,
    businessGoal,
    designDecisions,
    constraints,
    alternativesConsidered,
    userResearch
  });
}
