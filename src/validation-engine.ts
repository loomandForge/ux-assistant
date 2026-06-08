import { ValidationFinding } from './contract.js';
import { evaluateCodeLikeRule } from './validators/code-like-validator.js';
import { evaluateScreenshotRule, evaluateWebUrlRule } from './validators/visual-validator.js';
import { severityFromPriority, ValidatorRuleInput } from './validators/types.js';

type ValidationStatus = 'pass' | 'fail' | 'partial' | 'unknown';

type BuildPromptInput = {
  targetTool: string;
  overallCompliance: number | null;
  findings: ValidationFinding[];
  maxItems: number;
};

const severityRank: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

const toolIntro = (targetTool: string): string => {
  const key = targetTool.toLowerCase();
  if (key.includes('cursor')) {
    return 'Update the implementation in Cursor to satisfy approved context rules.';
  }
  if (key.includes('figma_make') || key.includes('figma')) {
    return 'Revise the Figma Make output to satisfy approved context rules.';
  }
  if (key.includes('v0')) {
    return 'Regenerate the v0 output to align with approved context rules.';
  }
  return `Revise the output for tool ${targetTool} to improve context compliance.`;
};

export const scoreFromStatuses = (statuses: ValidationStatus[]): number => {
  if (statuses.length === 0) {
    return 0;
  }

  const total = statuses.reduce((sum, status) => {
    if (status === 'pass') return sum + 100;
    if (status === 'partial') return sum + 60;
    if (status === 'unknown') return sum + 30;
    return sum;
  }, 0);

  return Math.round(total / statuses.length);
};

export const evaluateRuleFinding = (
  rule: ValidatorRuleInput,
  outputType: string,
  outputContent: string | null
): ValidationFinding => {
  const codeLikeFinding = evaluateCodeLikeRule(rule, outputType, outputContent);
  if (codeLikeFinding) {
    return codeLikeFinding;
  }

  if (outputType === 'web_url') {
    return evaluateWebUrlRule(rule, outputType);
  }

  if (outputType === 'screenshot' || outputType === 'image') {
    return evaluateScreenshotRule(rule, outputType);
  }

  const severity = severityFromPriority(rule.priority);

  return {
    ruleId: rule.ruleId,
    status: 'unknown',
    severity,
    confidence: 'low',
    evidence:
      `No deterministic validator is available yet for validatorType=${rule.validatorType} and outputType=${outputType}.`,
    recommendation: 'Use multimodal or domain-specific validator in the next pass to verify this rule.',
    correctionPrompt:
      'Re-check this output with a validator capable of evaluating this rule type and apply corrections if non-compliant.'
  };
};

export const buildCorrectionPrompt = ({
  targetTool,
  overallCompliance,
  findings,
  maxItems
}: BuildPromptInput): string => {
  const actionable = findings
    .filter(item => item.status === 'fail' || item.status === 'partial')
    .sort((a, b) => {
      const rankA = severityRank[a.severity] ?? 9;
      const rankB = severityRank[b.severity] ?? 9;
      return rankA - rankB;
    })
    .slice(0, maxItems);

  const source = actionable.length > 0 ? actionable : findings.slice(0, maxItems);
  const instructions = source.map((item, index) =>
    `${index + 1}. ${item.recommendation} Fix: ${item.correctionPrompt} (rule=${item.ruleId}, evidence=${item.evidence})`
  );

  return [
    toolIntro(targetTool),
    `Current compliance score: ${overallCompliance ?? 'unknown'}.`,
    'Apply these corrections in priority order:',
    ...instructions,
    'Keep the highest-priority user flow intact and avoid introducing new competing primary actions.'
  ].join('\n');
};
