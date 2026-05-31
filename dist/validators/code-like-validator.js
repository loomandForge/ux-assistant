import { severityFromPriority } from './types.js';
export const evaluateCodeLikeRule = (rule, outputType, outputContent) => {
    if (!outputContent || (outputType !== 'html' && outputType !== 'react_code')) {
        return null;
    }
    const severity = severityFromPriority(rule.priority);
    const text = `${rule.ruleId} ${rule.statement}`.toLowerCase();
    if (text.includes('cta') || text.includes('primary')) {
        const primaryMatches = outputContent.match(/btn-primary|variant\s*=\s*['\"]primary['\"]|primary cta/gi);
        const primaryCount = primaryMatches?.length ?? 0;
        if (primaryCount <= 1) {
            return {
                ruleId: rule.ruleId,
                status: 'pass',
                severity,
                confidence: 'medium',
                evidence: `Detected ${primaryCount} primary CTA marker(s) in source.`,
                recommendation: 'No change needed for CTA priority.',
                correctionPrompt: 'Keep one dominant primary CTA and preserve hierarchy in all breakpoints.'
            };
        }
        return {
            ruleId: rule.ruleId,
            status: 'fail',
            severity,
            confidence: 'medium',
            evidence: `Detected ${primaryCount} primary CTA marker(s), which likely causes CTA competition.`,
            recommendation: 'Retain exactly one primary CTA in the top-priority viewport region.',
            correctionPrompt: 'Revise the page so only one primary CTA remains in the hero/top section. Convert other competing actions to secondary or text links.'
        };
    }
    if (text.includes('token') || text.includes('design system') || text.includes('color')) {
        const hardcodedColorMatches = outputContent.match(/#[0-9a-fA-F]{3,8}/g);
        const hardcodedColorCount = hardcodedColorMatches?.length ?? 0;
        if (hardcodedColorCount === 0) {
            return {
                ruleId: rule.ruleId,
                status: 'pass',
                severity,
                confidence: 'medium',
                evidence: 'No hardcoded hex colors detected in the output source.',
                recommendation: 'Continue using design-system tokens consistently.',
                correctionPrompt: 'Maintain token-based color and spacing usage for all new UI additions.'
            };
        }
        return {
            ruleId: rule.ruleId,
            status: 'partial',
            severity,
            confidence: 'medium',
            evidence: `Detected ${hardcodedColorCount} hardcoded hex color value(s).`,
            recommendation: 'Replace hardcoded colors with approved semantic tokens.',
            correctionPrompt: 'Replace hardcoded color literals with approved design-system tokens and ensure components use the canonical theme variables.'
        };
    }
    return null;
};
