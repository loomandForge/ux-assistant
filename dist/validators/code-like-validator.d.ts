import { ValidationFinding } from '../contract.js';
import { ValidatorRuleInput } from './types.js';
export declare const evaluateCodeLikeRule: (rule: ValidatorRuleInput, outputType: string, outputContent: string | null) => ValidationFinding | null;
