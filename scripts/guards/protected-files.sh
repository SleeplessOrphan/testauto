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
  echo "::error::Files under tests/ differ from what the adversary locked."
  diff <(base64 -d <<<"$want" | jq -S .) <(base64 -d <<<"$have" | jq -S .) || true
  exit 1
fi
echo "protected-files passed"
