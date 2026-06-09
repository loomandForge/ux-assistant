import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const serverSource = readFileSync(join(process.cwd(), 'src', 'server.ts'), 'utf8');
const remoteFigmaToolSource = readFileSync(
  join(process.cwd(), 'src', 'tools', 'review-figma.ts'),
  'utf8'
);
const remoteInputToolSource = readFileSync(
  join(process.cwd(), 'src', 'tools', 'review-input.ts'),
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
