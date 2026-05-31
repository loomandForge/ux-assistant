#!/usr/bin/env sh
set -eu

# Keep local clone in sync with remote branch using fast-forward only updates.
TARGET_BRANCH="${1:-main}"
REMOTE_NAME="${REMOTE_NAME:-origin}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository"
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
  echo "Skipping auto-update: current branch is '$CURRENT_BRANCH' (target: '$TARGET_BRANCH')"
  exit 0
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Skipping auto-update: working tree has local changes"
  exit 0
fi

echo "Fetching latest changes from $REMOTE_NAME/$TARGET_BRANCH"
git fetch "$REMOTE_NAME" "$TARGET_BRANCH"

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "$REMOTE_NAME/$TARGET_BRANCH")"

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  echo "Already up to date"
  exit 0
fi

BASE_SHA="$(git merge-base HEAD "$REMOTE_NAME/$TARGET_BRANCH")"
if [ "$BASE_SHA" != "$LOCAL_SHA" ]; then
  echo "Skipping auto-update: local branch has commits not in $REMOTE_NAME/$TARGET_BRANCH"
  exit 0
fi

echo "Fast-forwarding to $REMOTE_NAME/$TARGET_BRANCH"
git merge --ff-only "$REMOTE_NAME/$TARGET_BRANCH"

echo "Auto-update complete"
