#!/usr/bin/env bash
# Run a coding agent in a loop on one GitHub issue, with a fresh context each
# time, until it writes DONE or STOP. State lives in .loop/<issue>/ (ignored by
# git). The agent never pushes; this script pushes the branch, which runs the
# pre-push checks, and opens a draft pull request.
#
#   scripts/agent-loop/run.sh <issue> [max-iterations]
#
# AGENT_CMD overrides the agent; it reads the prompt on stdin. Default:
#   codex exec --sandbox workspace-write -
set -euo pipefail

issue=${1:?usage: run.sh <issue> [max-iterations]}
max=${2:-30}
root=$(git rev-parse --show-toplevel)
state="$root/.loop/$issue"
branch="loop/issue-$issue"
agent=${AGENT_CMD:-codex exec --sandbox workspace-write -}

mkdir -p "$state"
gh issue view "$issue" --json title,body \
  --jq '"# " + .title + "\n\n" + .body' > "$state/task.md"
touch "$state/progress.md"

git fetch -q origin
if git rev-parse -q --verify "$branch" >/dev/null; then
  git switch -q "$branch"
else
  git switch -q -c "$branch" origin/main
fi

for i in $(seq 1 "$max"); do
  if [[ -f $state/DONE || -f $state/STOP ]]; then break; fi
  echo "== iteration $i/$max ($(date '+%H:%M'))"
  sed -e "s|{{STATE}}|.loop/$issue|g" -e "s|{{ITERATION}}|$i|g" \
    "$root/scripts/agent-loop/prompt.md" |
    bash -c "$agent" >>"$state/agent.log" 2>&1 || echo "agent exited with $?"
  # The agent's sandbox keeps .git read-only, so the script commits for it.
  if [[ -s $state/COMMIT ]]; then
    git add -A
    if git commit -q -F "$state/COMMIT"; then
      echo "   committed: $(head -n 1 "$state/COMMIT")"
    else
      echo "   commit refused (see the message above); changes left in the tree"
    fi
    rm -f "$state/COMMIT"
  fi
done

if [[ -f $state/STOP ]]; then
  echo "Stopped for the author:"
  cat "$state/STOP"
  exit 2
fi
if [[ ! -f $state/DONE ]]; then
  echo "No DONE after $max iterations; see $state/progress.md"
  exit 1
fi

git push -u origin "$branch"
gh pr create --draft --base main --head "$branch" \
  --title "$(head -n 1 "$state/DONE")" --body-file "$state/pr.md"
