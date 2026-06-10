import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reviewInput } from './pipeline.js';
import { ReviewStorage } from './storage.js';

const serverSource = readFileSync(join(process.cwd(), 'src', 'server.ts'), 'utf8');
const remoteFigmaToolSource = readFileSync(
  join(process.cwd(), 'src', 'tools', 'review-figma.ts'),
  'utf8'
);
const remoteInputToolSource = readFileSync(
  join(process.cwd(), 'src', 'tools', 'review-input.ts'),
  'utf8'
);
const remoteChallengeToolSource = readFileSync(
  join(process.cwd(), 'src', 'tools', 'challenge-design.ts'),
  'utf8'
);
const remoteImproveToolSource = readFileSync(
  join(process.cwd(), 'src', 'tools', 'improve-design.ts'),
  'utf8'
);
const remotePitchToolSource = readFileSync(
  join(process.cwd(), 'src', 'tools', 'pitch-design.ts'),
  'utf8'
);

test('server registers challenge_from_input tool', () => {
  assert.match(serverSource, /name:\s*'challenge_from_input'/);
  assert.match(serverSource, /Run review_input and challenge_design in one call/);
  assert.match(serverSource, /case 'challenge_from_input'/);
});

test('server registers analyze_design_input tool', () => {
  assert.match(serverSource, /name:\s*'analyze_design_input'/);
  assert.match(serverSource, /Canonical design analysis entry point/);
  assert.match(serverSource, /case 'analyze_design_input'/);
});

test('server registers knowledge and memory tools', () => {
  assert.match(serverSource, /name:\s*'store_knowledge_context'/);
  assert.match(serverSource, /name:\s*'list_knowledge_context'/);
  assert.match(serverSource, /name:\s*'store_memory_context'/);
  assert.match(serverSource, /name:\s*'list_memory_context'/);
});

test('server registers improve_from_input tool', () => {
  assert.match(serverSource, /name:\s*'improve_from_input'/);
  assert.match(serverSource, /Run review_input and improve_design in one call/);
  assert.match(serverSource, /case 'improve_from_input'/);
});

test('remote review tools call the pipeline instead of Phase 1 placeholders', () => {
  assert.match(remoteFigmaToolSource, /runRemoteFigmaReview/);
  assert.match(remoteInputToolSource, /runRemoteInputReview/);
  assert.doesNotMatch(remoteFigmaToolSource, /Phase 1|registered and available remotely|being migrated/);
  assert.doesNotMatch(remoteInputToolSource, /Phase 1|registered for remote discovery|being completed separately/);
});

test('remote follow-up tools synthesize from existing review runs', () => {
  assert.equal(existsSync(join(process.cwd(), 'src', 'tools', 'remote-review.ts')), false);
  assert.match(remoteChallengeToolSource, /runRemotePerspective/);
  assert.match(remoteImproveToolSource, /runRemotePerspective/);
  assert.match(remotePitchToolSource, /runRemotePerspective/);
  assert.doesNotMatch(
    `${remoteChallengeToolSource}\n${remoteImproveToolSource}\n${remotePitchToolSource}`,
    /Phase 1|registered and available remotely|serverless-safe phase 2 migration|Perspective generation will be wired/
  );
});

test('review_input accepts host-provided Figma evidence', async () => {
  const previousAutoSave = process.env.UX_REVIEW_AUTO_SAVE_MARKDOWN;
  process.env.UX_REVIEW_AUTO_SAVE_MARKDOWN = 'false';

  try {
    const dir = mkdtempSync(join(tmpdir(), 'ux-review-figma-evidence-'));
    const storage = new ReviewStorage(join(dir, 'test.db'));
    const result = await reviewInput(
      {
        figmaUrl: 'https://www.figma.com/design/abc123/Test?node-id=1-2',
        designSystem: 'none',
        figmaEvidence: {
          designContext: { code: '<Frame name="Checkout"><Button>Pay now</Button></Frame>' },
          metadata: { name: 'Checkout', absoluteBoundingBox: { width: 1440, height: 900 } },
          screenshot: { path: '/tmp/checkout.png' },
          variables: { colors: ['#111111', '#ffffff'] }
        }
      },
      storage
    );

    assert.equal(result.inputType, 'figma_url');
    const toolCalls = storage.getToolCalls(result.runId);
    assert.ok(toolCalls.some(call => call.tool_name === 'get_design_context' && call.status === 'success'));
    assert.ok(toolCalls.some(call => call.tool_name === 'get_metadata' && call.status === 'success'));
    assert.ok(toolCalls.some(call => call.tool_name === 'get_screenshot' && call.status === 'success'));
    assert.ok(toolCalls.some(call => call.tool_name === 'get_variable_defs' && call.status === 'success'));

    const report = storage.getReport(result.runId) ?? '';
    assert.match(report, /Confidence Level/);
    assert.match(report, /Observed signals/);
  } finally {
    if (previousAutoSave === undefined) {
      delete process.env.UX_REVIEW_AUTO_SAVE_MARKDOWN;
    } else {
      process.env.UX_REVIEW_AUTO_SAVE_MARKDOWN = previousAutoSave;
    }
  }
});
