import { copyFile, mkdir, writeFile } from 'node:fs/promises';
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
const pdfVendorDirectory = resolve(
  repositoryRoot,
  'docs/electrical-experience-lab/vendor/pdfjs'
);
const pdfJsDirectory = resolve(repositoryRoot, 'node_modules/pdfjs-dist');
const result = runElectricalExperienceFlow(scenario001);

await mkdir(dirname(outputPath), { recursive: true });
await mkdir(pdfVendorDirectory, { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify({ scenario: scenario001, ...result }, null, 2)}\n`,
  'utf8'
);
await Promise.all([
  copyFile(
    resolve(pdfJsDirectory, 'build/pdf.min.mjs'),
    resolve(pdfVendorDirectory, 'pdf.min.mjs')
  ),
  copyFile(
    resolve(pdfJsDirectory, 'build/pdf.worker.min.mjs'),
    resolve(pdfVendorDirectory, 'pdf.worker.min.mjs')
  ),
  copyFile(
    resolve(pdfJsDirectory, 'LICENSE'),
    resolve(pdfVendorDirectory, 'LICENSE')
  )
]);

console.log(`Electrical prototype data and PDF parser written to ${dirname(outputPath)}`);
