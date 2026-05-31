export type ReviewParameterKey =
  | 'user_flow_interaction'
  | 'visual_hierarchy_layout'
  | 'design_system_consistency'
  | 'accessibility_wcag'
  | 'content_information_architecture'
  | 'technical_feasibility'
  | 'brand_design_quality';

export type EvidenceConfidence = 'observed' | 'assumed' | 'unknown';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ReviewEvidence {
  parameter: ReviewParameterKey;
  label: string;
  detail: string;
  confidence: EvidenceConfidence;
}

export interface ReviewIssue {
  parameter: ReviewParameterKey;
  severity: IssueSeverity;
  title: string;
  recommendation: string;
  evidence: string;
}

export interface ParameterScore {
  parameter: ReviewParameterKey;
  score: number;
  alignmentPct: number;
  deviationPct: number;
  summary: string;
}

export interface DeterministicReviewResult {
  scores: ParameterScore[];
  evidence: ReviewEvidence[];
  issues: ReviewIssue[];
  overallAlignmentPct: number;
  overallDeviationPct: number;
  strategicBranch?: import('./policy.js').StrategicBranchEvaluation;
}
