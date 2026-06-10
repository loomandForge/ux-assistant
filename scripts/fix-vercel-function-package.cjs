#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const functionsRoot = path.join(root, '.vercel', 'output', 'functions');
const scoringSourceRoot = path.join(root, 'scoring');
const scoringPackageFiles = ['package.json', 'dist'];
const scoringRequirePattern =
  /createRequire\)\("file:[^"]+\/src\/pipeline\.ts"\)\("@ux-assistant\/scoring"\)/g;

function walkPackageFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    return acc;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkPackageFiles(fullPath, acc);
      continue;
    }

    if (entry.isFile() && entry.name === 'package.json') {
      acc.push(fullPath);
    }
  }

  return acc;
}

function walkJsFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    return acc;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkJsFiles(fullPath, acc);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      acc.push(fullPath);
    }
  }

  return acc;
}

const packageFiles = walkPackageFiles(functionsRoot);
let patchedCount = 0;
let copiedScoringCount = 0;
let patchedScoringRequireCount = 0;

for (const filePath of packageFiles) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const pkg = JSON.parse(raw);
  const functionRoot = path.dirname(filePath);

  if (pkg.type !== 'commonjs') {
    pkg.type = 'commonjs';
    fs.writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    patchedCount += 1;
  }

  const scoringTargetRoot = path.join(functionRoot, 'node_modules', '@ux-assistant', 'scoring');
  fs.rmSync(scoringTargetRoot, { recursive: true, force: true });
  fs.mkdirSync(scoringTargetRoot, { recursive: true });

  for (const packageFile of scoringPackageFiles) {
    const source = path.join(scoringSourceRoot, packageFile);
    const target = path.join(scoringTargetRoot, packageFile);
    fs.cpSync(source, target, { recursive: true });
  }

  copiedScoringCount += 1;
}

for (const jsFilePath of walkJsFiles(functionsRoot)) {
  const raw = fs.readFileSync(jsFilePath, 'utf8');
  const patched = raw.replace(
    scoringRequirePattern,
    'createRequire)(__filename)("@ux-assistant/scoring")'
  );

  if (patched !== raw) {
    fs.writeFileSync(jsFilePath, patched, 'utf8');
    patchedScoringRequireCount += 1;
  }
}

console.log(`Patched ${patchedCount} Vercel function package.json file(s) to commonjs.`);
console.log(`Copied @ux-assistant/scoring into ${copiedScoringCount} Vercel function(s).`);
console.log(`Patched ${patchedScoringRequireCount} generated scoring require(s).`);
