import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRATEGIC_CONTRACT_VERSION, strategicArtifactsSchema } from './contract.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const loadFixture = (name) => {
    const fixturePath = resolve(__dirname, '../fixtures', name);
    const raw = readFileSync(fixturePath, 'utf8');
    const parsed = JSON.parse(raw);
    return strategicArtifactsSchema.parse(parsed);
};
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
const main = () => {
    const weak = loadFixture('strategic-weak.json');
    const strong = loadFixture('strategic-strong.json');
    assert(Boolean(weak.improvementPack), 'Weak fixture must include improvementPack');
    assert(!weak.persuasionPack, 'Weak fixture must not include persuasionPack');
    assert(Boolean(strong.persuasionPack), 'Strong fixture must include persuasionPack');
    assert(!strong.improvementPack, 'Strong fixture must not include improvementPack');
    assert((weak.edgeCaseFindings?.length ?? 0) > 0, 'Weak fixture must include tagged edgeCaseFindings');
    assert((strong.flowIaStructure?.nodes.length ?? 0) >= 5, 'Strong fixture must include rich flowIaStructure nodes');
    assert((strong.flowIaStructure?.edges.length ?? 0) >= 5, 'Strong fixture must include rich flowIaStructure edges');
    assert((strong.flowIaStructure?.scenarios.length ?? 0) >= 3, 'Strong fixture must include scenario diversity');
    console.log(`Contract check passed: ${STRATEGIC_CONTRACT_VERSION}`);
};
main();
