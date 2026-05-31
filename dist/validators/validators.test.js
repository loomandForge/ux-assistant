import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCodeLikeRule } from './code-like-validator.js';
import { evaluateScreenshotRule, evaluateWebUrlRule } from './visual-validator.js';
test('evaluateCodeLikeRule detects CTA competition', () => {
    const finding = evaluateCodeLikeRule({
        ruleId: 'cta.001',
        statement: 'Use one primary CTA in hero',
        validatorType: 'deterministic_html',
        priority: 'high'
    }, 'html', '<button class="btn-primary">One</button><button class="btn-primary">Two</button>');
    assert.ok(finding);
    assert.equal(finding?.status, 'fail');
});
test('evaluateCodeLikeRule returns null for non-code output', () => {
    const finding = evaluateCodeLikeRule({
        ruleId: 'cta.001',
        statement: 'Use one primary CTA in hero',
        validatorType: 'deterministic_html',
        priority: 'high'
    }, 'screenshot', null);
    assert.equal(finding, null);
});
test('evaluateWebUrlRule marks unknown with guidance', () => {
    const finding = evaluateWebUrlRule({
        ruleId: 'nav.001',
        statement: 'Primary navigation must be consistent',
        validatorType: 'deterministic_web',
        priority: 'medium'
    }, 'web_url');
    assert.equal(finding.status, 'unknown');
    assert.match(finding.evidence, /Direct web URL inspection validator/i);
});
test('evaluateScreenshotRule marks unknown with visual guidance', () => {
    const finding = evaluateScreenshotRule({
        ruleId: 'brand.visual.001',
        statement: 'Use calm visual hierarchy',
        validatorType: 'visual_llm',
        priority: 'high'
    }, 'screenshot');
    assert.equal(finding.status, 'unknown');
    assert.match(finding.recommendation, /visual analysis/i);
});
