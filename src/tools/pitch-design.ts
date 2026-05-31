import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';

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
  return [
    '# pitch_design (Phase 1)',
    '',
    `runId: ${runId}`,
    `audience: ${audience ?? 'n/a'}`,
    `businessGoal: ${businessGoal ?? 'n/a'}`,
    `designDecisions: ${designDecisions?.length ?? 0}`,
    `constraints: ${constraints?.length ?? 0}`,
    `alternativesConsidered: ${alternativesConsidered?.length ?? 0}`,
    `userResearch provided: ${userResearch ? 'yes' : 'no'}`,
    '',
    'Tool is registered and available remotely.',
    'Stakeholder pitch generation will be wired in serverless-safe phase 2 migration.'
  ].join('\n');
}