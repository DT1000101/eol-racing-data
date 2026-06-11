#!/usr/bin/env bash
# Run after: gh auth login
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! gh auth status >/dev/null 2>&1; then
  echo "Not logged in. Run: gh auth login"
  exit 1
fi

REPO_NAME="${1:-eol-dynamic-divisions}"
if ! gh repo view "DT1000101/$REPO_NAME" >/dev/null 2>&1; then
  gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
  echo "Created and pushed private repo: DT1000101/$REPO_NAME"
else
  git push -u origin main
  echo "Pushed to existing repo: DT1000101/$REPO_NAME"
fi
