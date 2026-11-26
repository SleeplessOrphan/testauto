#!/usr/bin/env bash
# Fails when app code changed but neither docs/ nor CHANGELOG.md did.
set -euo pipefail
base=${1:?base commit}
changed=$(git diff --name-only "$base" HEAD)
echo "Changed files:"; echo "$changed" | sed 's/^/  /'
if grep -qE '^src/' <<<"$changed" && ! grep -qE '^(docs/|CHANGELOG\.md$)' <<<"$changed"; then
  echo "::error::Code under src/ changed but docs/ and CHANGELOG.md did not. Update the docs in the same pull request."
  exit 1
fi
echo "docs-check passed"
