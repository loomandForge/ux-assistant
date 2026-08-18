import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  runElectricalExperienceFlow,
  scenario001
} from '../dist/electrical-experience-lab/index.js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(
  repositoryRoot,
  'docs/electrical-experience-lab/scenario-001.json'
);
const result = runElectricalExperienceFlow(scenario001);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify({ scenario: scenario001, ...result }, null, 2)}\n`,
  'utf8'
);

console.log(`Electrical prototype data written to ${outputPath}`);
