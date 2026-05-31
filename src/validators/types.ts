import { ValidationFinding } from '../contract.js';

export type ValidatorRuleInput = {
  ruleId: string;
  statement: string;
  validatorType: string;
  priority: string;
};

export const severityFromPriority = (
  priority: string
): ValidationFinding['severity'] => {
  if (priority === 'critical') return 'critical';
  if (priority === 'high') return 'high';
  if (priority === 'low') return 'low';
  return 'medium';
};
