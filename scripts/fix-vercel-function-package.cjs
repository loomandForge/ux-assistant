#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const functionsRoot = path.join(root, '.vercel', 'output', 'functions');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    return acc;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }

    if (entry.isFile() && entry.name === 'package.json') {
      acc.push(fullPath);
    }
  }

  return acc;
}

const packageFiles = walk(functionsRoot);
let patchedCount = 0;

for (const filePath of packageFiles) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const pkg = JSON.parse(raw);

  if (pkg.type !== 'commonjs') {
    pkg.type = 'commonjs';
    fs.writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    patchedCount += 1;
  }
}

console.log(`Patched ${patchedCount} Vercel function package.json file(s) to commonjs.`);