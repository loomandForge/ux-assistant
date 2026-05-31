export type ReviewStage =
  | 'queued'
  | 'fetching_input'
  | 'querying_design_system'
  | 'scoring'
  | 'generating_narrative'
  | 'building_report'
  | 'completed'
  | 'failed';

export const STAGE_MESSAGE: Record<ReviewStage, string> = {
  queued: 'Review request queued',
  fetching_input: 'Fetching design input',
  querying_design_system: 'Querying design system guidance',
  scoring: 'Calculating deterministic scores',
  generating_narrative: 'Generating narrative commentary',
  building_report: 'Building report artifacts',
  completed: 'Review completed',
  failed: 'Review failed'
};
