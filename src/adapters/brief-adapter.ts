import type { ScoringBundle } from '@ux-assistant/scoring';
import type { ReviewInputRequest } from '../input-detect.js';

export interface BriefIngestionResult {
  strategicContext: ScoringBundle['strategicContext'];
  summary: {
    hasProblemStatement: boolean;
    hasProposedSolution: boolean;
    requirementsCount: number;
  };
}

const normalizeRequirements = (requirements?: string[]): string[] | undefined => {
  if (!requirements || requirements.length === 0) {
    return undefined;
  }

  const deduped = Array.from(
    new Set(requirements.map(item => item.trim()).filter(item => item.length > 0))
  );
  return deduped.length > 0 ? deduped : undefined;
};

export const ingestBriefContext = (
  request: Pick<ReviewInputRequest, 'problemStatement' | 'proposedSolution' | 'requirements'>
): BriefIngestionResult => {
  const problemStatement = request.problemStatement?.trim() || undefined;
  const proposedSolution = request.proposedSolution?.trim() || undefined;
  const requirements = normalizeRequirements(request.requirements);

  return {
    strategicContext: {
      problemStatement,
      proposedSolution,
      requirements
    },
    summary: {
      hasProblemStatement: !!problemStatement,
      hasProposedSolution: !!proposedSolution,
      requirementsCount: requirements?.length ?? 0
    }
  };
};
