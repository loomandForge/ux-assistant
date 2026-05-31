import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addContextRuleInputSchema,
  compareValidationRunsInputSchema,
  createContextPackInputSchema,
  createProjectInputSchema,
  generateCorrectionPromptInputSchema,
  validateOutputAgainstContextInputSchema,
  validationFindingSchema
} from './contract.js';

test('createProjectInputSchema accepts valid payload', () => {
  const parsed = createProjectInputSchema.parse({ name: 'Medhyam' });
  assert.equal(parsed.name, 'Medhyam');
});

test('addContextRuleInputSchema rejects missing statement', () => {
  assert.throws(() => {
    addContextRuleInputSchema.parse({
      projectId: 1,
      ruleId: 'brand.visual.001',
      category: 'brand_expression',
      priority: 'high',
      authority: 'approved',
      appliesTo: ['homepage'],
      validatorType: 'visual_llm'
    });
  });
});

test('createContextPackInputSchema accepts explicit rule IDs', () => {
  const parsed = createContextPackInputSchema.parse({
    projectId: 1,
    name: 'homepage_v1',
    version: 'v1',
    ruleIds: [1, 2, 3]
  });
  assert.deepEqual(parsed.ruleIds, [1, 2, 3]);
});

test('validateOutputAgainstContextInputSchema validates required fields', () => {
  const parsed = validateOutputAgainstContextInputSchema.parse({
    contextPackId: 3,
    targetTool: 'figma_make',
    outputType: 'screenshot',
    outputRef: '/tmp/output.png'
  });

  assert.equal(parsed.outputType, 'screenshot');
});

test('validationFindingSchema accepts expected statuses', () => {
  const finding = validationFindingSchema.parse({
    ruleId: 'cta.001',
    status: 'fail',
    severity: 'high',
    confidence: 'high',
    evidence: 'Three competing primary CTAs above fold',
    recommendation: 'Keep only one primary CTA',
    correctionPrompt:
      'Revise hero so only Enquire Now is primary. Convert others to secondary links.'
  });

  assert.equal(finding.status, 'fail');
});

test('generateCorrectionPromptInputSchema validates required fields', () => {
  const parsed = generateCorrectionPromptInputSchema.parse({
    validationRunId: 7,
    targetTool: 'cursor',
    maxItems: 3
  });

  assert.equal(parsed.validationRunId, 7);
});

test('compareValidationRunsInputSchema validates required fields', () => {
  const parsed = compareValidationRunsInputSchema.parse({
    currentValidationRunId: 9,
    previousValidationRunId: 8
  });

  assert.equal(parsed.currentValidationRunId, 9);
});
