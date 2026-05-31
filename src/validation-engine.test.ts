import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCorrectionPrompt, evaluateRuleFinding, scoreFromStatuses } from './validation-engine.js';

test('evaluateRuleFinding fails CTA rule when multiple primary markers exist', () => {
  const finding = evaluateRuleFinding(
    {
      ruleId: 'cta.001',
      statement: 'Use one primary CTA in hero',
      validatorType: 'deterministic_html',
      priority: 'high'
    },
    'html',
    '<button class="btn-primary">One</button><button class="btn-primary">Two</button>'
  );

  assert.equal(finding.status, 'fail');
  assert.equal(finding.severity, 'high');
});

test('evaluateRuleFinding marks token rule partial when hardcoded colors are found', () => {
  const finding = evaluateRuleFinding(
    {
      ruleId: 'design.token.001',
      statement: 'Use design system tokens for colors',
      validatorType: 'deterministic_code',
      priority: 'medium'
    },
    'react_code',
    'const color = "#FFFFFF";'
  );

  assert.equal(finding.status, 'partial');
});

test('scoreFromStatuses computes weighted compliance average', () => {
  const score = scoreFromStatuses(['pass', 'partial', 'unknown', 'fail']);
  assert.equal(score, 48);
});

test('buildCorrectionPrompt adapts for cursor target', () => {
  const prompt = buildCorrectionPrompt({
    targetTool: 'cursor',
    overallCompliance: 62,
    findings: [
      {
        ruleId: 'cta.001',
        status: 'fail',
        severity: 'high',
        confidence: 'high',
        evidence: 'Three competing primary CTAs',
        recommendation: 'Keep one primary CTA',
        correctionPrompt: 'Reduce CTA competition'
      }
    ],
    maxItems: 2
  });

  assert.match(prompt, /Update the implementation in Cursor/i);
  assert.match(prompt, /Keep one primary CTA/i);
});

test('buildCorrectionPrompt adapts for figma_make target', () => {
  const prompt = buildCorrectionPrompt({
    targetTool: 'figma_make',
    overallCompliance: 55,
    findings: [
      {
        ruleId: 'brand.visual.001',
        status: 'partial',
        severity: 'medium',
        confidence: 'medium',
        evidence: 'Palette drifts to high saturation accents',
        recommendation: 'Use approved calm neutral palette',
        correctionPrompt: 'Adjust palette to approved tokens'
      }
    ],
    maxItems: 1
  });

  assert.match(prompt, /Revise the Figma Make output/i);
  assert.match(prompt, /approved calm neutral palette/i);
});
