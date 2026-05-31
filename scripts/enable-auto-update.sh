#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

git config core.hooksPath .githooks
chmod +x .githooks/post-merge
chmod +x scripts/auto-update.sh

echo "Auto-update hooks enabled for this clone"
echo "Configured git hooks path: .githooks"
