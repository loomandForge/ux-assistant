import { severityFromPriority } from './types.js';
export const evaluateWebUrlRule = (rule, outputType) => {
    const severity = severityFromPriority(rule.priority);
    if (outputType !== 'web_url') {
        return {
            ruleId: rule.ruleId,
            status: 'unknown',
            severity,
            confidence: 'low',
            evidence: `Web URL validator does not apply to outputType=${outputType}.`,
            recommendation: 'Use an output-type compatible validator.',
            correctionPrompt: 'Re-validate this rule with a compatible output type.'
        };
    }
    return {
        ruleId: rule.ruleId,
        status: 'unknown',
        severity,
        confidence: 'low',
        evidence: 'Direct web URL inspection validator is not yet implemented in deterministic mode.',
        recommendation: 'Capture rendered HTML/screenshot and re-run validation with deterministic checks.',
        correctionPrompt: 'Provide rendered output evidence and apply corrections against approved rules.'
    };
};
export const evaluateScreenshotRule = (rule, outputType) => {
    const severity = severityFromPriority(rule.priority);
    if (outputType !== 'screenshot' && outputType !== 'image') {
        return {
            ruleId: rule.ruleId,
            status: 'unknown',
            severity,
            confidence: 'low',
            evidence: `Visual validator does not apply to outputType=${outputType}.`,
            recommendation: 'Use a validator aligned to the output type.',
            correctionPrompt: 'Re-validate this rule using a matching validator.'
        };
    }
    return {
        ruleId: rule.ruleId,
        status: 'unknown',
        severity,
        confidence: 'low',
        evidence: 'Pixel-level visual validator is not yet implemented for screenshot/image inputs.',
        recommendation: 'Run visual analysis pass before final compliance decision.',
        correctionPrompt: 'Adjust output to satisfy this rule, then verify with a visual validator.'
    };
};
