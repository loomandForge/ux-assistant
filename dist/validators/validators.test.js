import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCodeLikeRule } from './code-like-validator.js';
import { checkoutWithStrongStructure, checkoutWithUxIssues } from './fixtures.js';
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
    assert.match(finding?.evidence ?? '', /One/);
    assert.match(finding?.evidence ?? '', /Two/);
});
test('evaluateCodeLikeRule passes a single primary CTA with strong evidence', () => {
    const finding = evaluateCodeLikeRule({
        ruleId: 'cta.001',
        statement: 'Use one primary CTA in checkout',
        validatorType: 'deterministic_html',
        priority: 'high'
    }, 'html', checkoutWithStrongStructure);
    assert.ok(finding);
    assert.equal(finding?.status, 'pass');
    assert.equal(finding?.confidence, 'high');
    assert.match(finding?.evidence ?? '', /Submit order/);
});
test('evaluateCodeLikeRule detects hardcoded color literals beyond hex', () => {
    const finding = evaluateCodeLikeRule({
        ruleId: 'design.token.001',
        statement: 'Use design system tokens for colors',
        validatorType: 'deterministic_code',
        priority: 'medium'
    }, 'html', checkoutWithUxIssues);
    assert.ok(finding);
    assert.equal(finding?.status, 'partial');
    assert.equal(finding?.confidence, 'high');
    assert.match(finding?.evidence ?? '', /#111111/);
    assert.match(finding?.evidence ?? '', /rgba/);
});
test('evaluateCodeLikeRule flags skipped heading hierarchy', () => {
    const finding = evaluateCodeLikeRule({
        ruleId: 'ia.heading.001',
        statement: 'Use a clear heading hierarchy',
        validatorType: 'deterministic_html',
        priority: 'medium'
    }, 'html', checkoutWithUxIssues);
    assert.ok(finding);
    assert.equal(finding?.status, 'partial');
    assert.match(finding?.evidence ?? '', /h1 -> h3/);
});
test('evaluateCodeLikeRule passes semantic landmark evidence', () => {
    const finding = evaluateCodeLikeRule({
        ruleId: 'a11y.semantic.001',
        statement: 'Use semantic landmarks for page structure',
        validatorType: 'deterministic_html',
        priority: 'medium'
    }, 'html', checkoutWithStrongStructure);
    assert.ok(finding);
    assert.equal(finding?.status, 'pass');
    assert.match(finding?.evidence ?? '', /main\/navigation landmarks/i);
});
test('evaluateCodeLikeRule fails form rules when error states are missing', () => {
    const finding = evaluateCodeLikeRule({
        ruleId: 'form.error.001',
        statement: 'Accessible form error states must be present',
        validatorType: 'deterministic_html',
        priority: 'high'
    }, 'html', checkoutWithUxIssues);
    assert.ok(finding);
    assert.equal(finding?.status, 'fail');
    assert.match(finding?.evidence ?? '', /form controls/i);
});
test('evaluateCodeLikeRule passes accessible form error state evidence', () => {
    const finding = evaluateCodeLikeRule({
        ruleId: 'form.error.001',
        statement: 'Accessible form error states must be present',
        validatorType: 'deterministic_html',
        priority: 'high'
    }, 'html', checkoutWithStrongStructure);
    assert.ok(finding);
    assert.equal(finding?.status, 'pass');
    assert.match(finding?.evidence ?? '', /labels and error-state hooks/i);
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
