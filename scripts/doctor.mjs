#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const rows = [];

const run = (command, args = []) => {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 5000,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
    status: result.status
  };
};

const add = (name, ok, detail, fix = '') => {
  rows.push({ name, ok, detail, fix });
};

const commandVersion = (command, args = ['--version']) => {
  const result = run(command, args);
  return result.ok ? result.stdout.split('\n')[0] : '';
};

const requiredNodeMajor = (() => {
  try {
    return readFileSync(join(repoRoot, '.nvmrc'), 'utf8').trim().replace(/^v/, '').split('.')[0];
  } catch {
    return '20';
  }
})();

const currentNodeMajor = process.versions.node.split('.')[0];
add(
  'Node.js',
  currentNodeMajor === requiredNodeMajor,
  `current v${process.versions.node}, required major ${requiredNodeMajor}`,
  `Run nvm install ${requiredNodeMajor} && nvm use`
);

const pnpmVersion = commandVersion('pnpm');
add(
  'pnpm',
  Boolean(pnpmVersion),
  pnpmVersion || 'not found in PATH',
  'Install via corepack or run npx pnpm@10.34.1 i --frozen-lockfile'
);

const gitVersion = commandVersion('git');
const origin = run('git', ['remote', 'get-url', 'origin']);
add(
  'Git remote',
  Boolean(gitVersion) && origin.ok,
  origin.ok ? origin.stdout : 'origin remote not configured',
  'Set origin to git@github.com:loomandForge/ux-assistant.git'
);

const ghVersion = commandVersion('gh');
const ghAuth = ghVersion ? run('gh', ['auth', 'status']) : { ok: false, stderr: 'gh not found' };
add(
  'GitHub CLI',
  Boolean(ghVersion) && ghAuth.ok,
  ghVersion ? (ghAuth.ok ? 'installed and authenticated' : 'installed, authentication not confirmed') : 'not found in PATH',
  'Install gh and run gh auth login'
);

const codexEnv =
  Boolean(process.env.CODEX_HOME) ||
  Boolean(process.env.CODEX_SANDBOX) ||
  Boolean(process.env.CODEX_SESSION_ID);
const codexVersion = commandVersion('codex');
add(
  'Codex environment',
  codexEnv || Boolean(codexVersion),
  codexEnv ? 'Codex environment variables detected' : codexVersion || 'Codex CLI/session not detected',
  'Run inside Codex or install/login to the Codex CLI if your workflow needs it'
);

const copilotHostsPath = join(
  process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'),
  'github-copilot',
  'hosts.json'
);
const hasModelEnv =
  Boolean(process.env.GHCP_TOKEN) ||
  Boolean(process.env.GITHUB_TOKEN) ||
  Boolean(process.env.GLM_API_KEY);
const hasCopilotHosts = existsSync(copilotHostsPath);
add(
  'Model-assisted reports',
  hasModelEnv || hasCopilotHosts,
  hasModelEnv
    ? 'GHCP/GitHub/GLM environment token detected'
    : hasCopilotHosts
      ? 'GitHub Copilot hosts.json detected'
      : 'no model token or Copilot credential file detected',
  'Set GHCP_TOKEN, GITHUB_TOKEN, GLM_API_KEY, or sign in to GitHub Copilot'
);

const figmaUrl = process.env.FIGMA_MCP_URL;
add(
  'Figma MCP',
  Boolean(figmaUrl),
  figmaUrl || 'optional FIGMA_MCP_URL not set',
  'Set FIGMA_MCP_URL when reviewing Figma links through a local Figma MCP bridge'
);

console.log('\nux_assistant doctor');
console.log('===================\n');

for (const row of rows) {
  const mark = row.ok ? 'OK' : 'WARN';
  console.log(`[${mark}] ${row.name}: ${row.detail}`);
  if (!row.ok && row.fix) {
    console.log(`     ${row.fix}`);
  }
}

const blocking = rows.filter(row => !row.ok && ['Node.js', 'pnpm', 'Git remote'].includes(row.name));
console.log('');
if (blocking.length > 0) {
  console.log(`Doctor finished with ${blocking.length} setup warning(s) to fix before a clean local build.`);
  process.exitCode = 1;
} else {
  console.log('Doctor finished. Core local build prerequisites are present.');
}
