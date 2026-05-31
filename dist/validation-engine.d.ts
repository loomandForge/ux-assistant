import { ValidationFinding } from './contract.js';
import { ValidatorRuleInput } from './validators/types.js';
type ValidationStatus = 'pass' | 'fail' | 'partial' | 'unknown';
type BuildPromptInput = {
    targetTool: string;
    overallCompliance: number | null;
    findings: ValidationFinding[];
    maxItems: number;
};
export declare const scoreFromStatuses: (statuses: ValidationStatus[]) => number;
export declare const evaluateRuleFinding: (rule: ValidatorRuleInput, outputType: string, outputContent: string | null) => ValidationFinding;
export declare const buildCorrectionPrompt: ({ targetTool, overallCompliance, findings, maxItems }: BuildPromptInput) => string;
export {};
