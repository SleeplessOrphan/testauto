#!/usr/bin/env bash
# Fails when an agent's task PR is bigger than the limits in models.yaml. Tests and the lockfile don't count;
# CHANGELOG.md, CLAUDE.md and docs/ count toward lines but not files.
# Only task/* branches are checked; your own PRs are exempt.
source "$(dirname "$0")/../pipeline/lib.sh"
base=${1:?base commit} branch=${2:?branch}
if [[ $branch != task/* ]]; then echo "Not an agent branch ($branch); size-check skipped."; exit 0; fi
max_lines=$(cfg .limits.max_changed_lines); max_files=$(cfg .limits.max_changed_files)
stats=$(git diff --numstat "$base" HEAD -- . ':(exclude)tests/**' ':(exclude)package-lock.json')
# Every task has to update CHANGELOG.md, CLAUDE.md and docs/, so those don't count toward the file limit.
files=$(awk '$3 !~ /^(CHANGELOG\.md|CLAUDE\.md|docs\/)/' <<<"$stats" | grep -c . || true)
lines=$(awk '{a+=($1=="-"?0:$1); d+=($2=="-"?0:$2)} END {print a+d+0}' <<<"$stats")
echo "Changed: $files files, $lines lines (limits: $max_files files, $max_lines lines)"
if (( files > max_files || lines > max_lines )); then
  echo "::error::This task is too big for one pull request ($files files, $lines lines). It needs to be split."
  exit 1
fi
