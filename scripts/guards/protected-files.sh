#!/usr/bin/env bash
# On agent branches: fails if the PR touches files agents may not change, or if the tests differ from
# what the adversary last locked (so the coder can't edit or delete the tests it has to pass).
source "$(dirname "$0")/../pipeline/lib.sh"
base=${1:?base commit} branch=${2:?branch}
if [[ $branch != task/* ]]; then echo "Not an agent branch ($branch); protected-files skipped."; exit 0; fi
n=${branch#task/}

bad=$(git diff --name-only "$base" HEAD | grep -E "$PROTECTED_RE" || true)
if [[ -n $bad ]]; then
  echo "::error::This PR changes protected files:"; echo "$bad"
  exit 1
fi

want=$(last_marker "$n" tests-lock)
if [[ -z $want ]]; then
  echo "::error::No test lock found on issue #$n. The adversary must write the tests before the code."
  exit 1
fi
have=$(tests_lock)
if [[ $want != "$have" ]]; then
  # Merging main into the branch brings in other tasks' tests. Test files this branch's own commits
  # touched must match the lock exactly; every other test file must match main (where it came from).
  mine=$(git log --no-merges --format= --name-only "$base..HEAD" -- tests | sort -u | jq -R -s -c 'split("\n") | map(select(length > 0))')
  main=$(git ls-tree -r --name-only "$base" -- tests | while IFS= read -r f; do
    printf '%s  %s\n' "$(git show "$base:$f" | sha256sum | cut -d' ' -f1)" "$f"
  done | jq -R -s -c 'split("\n") | map(select(length > 0) | capture("^(?<h>[0-9a-f]+)  (?<p>.+)$") | {(.p): .h}) | add // {}')
  off=$(jq -n -r --argjson w "$(base64 -d <<<"$want")" --argjson h "$(base64 -d <<<"$have")" \
    --argjson b "$main" --argjson m "$mine" '
    [($w + $h + $b) | keys[] | . as $p | select(if ($m | any(. == $p)) then $w[$p] != $h[$p] else $b[$p] != $h[$p] end)] | .[]')
  if [[ -n $off ]]; then
    echo "::error::Files under tests/ differ from what the adversary locked:"; echo "$off"
    exit 1
  fi
  echo "Tests match the lock, apart from tests that came in unchanged from main."
fi
echo "protected-files passed"
