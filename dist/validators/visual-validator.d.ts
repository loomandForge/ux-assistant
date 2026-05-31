import { ValidationFinding } from '../contract.js';
import { ValidatorRuleInput } from './types.js';
export declare const evaluateWebUrlRule: (rule: ValidatorRuleInput, outputType: string) => ValidationFinding;
export declare const evaluateScreenshotRule: (rule: ValidatorRuleInput, outputType: string) => ValidationFinding;
