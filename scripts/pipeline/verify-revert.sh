#!/usr/bin/env bash
# Approves an automatic revert PR only if it is exactly `git revert` of the commit named in its body.
source "$(dirname "$0")/lib.sh"
pr=${PR:?}
target=$(gh pr view "$pr" --json body -q .body | grep -oP '<!-- revert-of:\K[0-9a-f]{40}(?= -->)' || true)
verdict=reject
if [[ -z $target ]]; then
  echo "::error::PR #$pr does not name the commit it reverts."
elif [[ $(git rev-list --count origin/main..HEAD) != 1 ]]; then
  echo "::error::A revert PR must contain exactly one commit."
elif diff <(git diff "$target^" "$target") <(git diff HEAD HEAD~1) >/dev/null; then
  echo "PR #$pr is an exact revert of $target."
  verdict=approve
else
  echo "::error::PR #$pr is not an exact revert of $target."
fi
echo "verdict=$verdict" >> "$GITHUB_OUTPUT"
