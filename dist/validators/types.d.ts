import { ValidationFinding } from '../contract.js';
export type ValidatorRuleInput = {
    ruleId: string;
    statement: string;
    validatorType: string;
    priority: string;
};
export declare const severityFromPriority: (priority: string) => ValidationFinding["severity"];
