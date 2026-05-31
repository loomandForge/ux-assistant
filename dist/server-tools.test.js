import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const serverSource = readFileSync(join(process.cwd(), 'src', 'server.ts'), 'utf8');
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
