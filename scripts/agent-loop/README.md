# Agent loop

Runs a coding agent on one GitHub issue again and again, each time with a
fresh context, until the agent reports the goal reached or a question for the
author. Everything an iteration knows comes from the repository and from
`.loop/<issue>/` (ignored by git):

| File          | Written by | Meaning                                          |
| ------------- | ---------- | ------------------------------------------------ |
| `task.md`     | the script | the issue text: goal, measure, limits            |
| `progress.md` | the agent  | one entry per iteration: change, measure, lesson |
| `COMMIT`      | the agent  | commit message for the change it kept            |
| `DONE`        | the agent  | goal reached; first line is the PR title         |
| `pr.md`       | the agent  | pull request body                                |
| `STOP`        | the agent  | a question for the author, or no progress        |
| `agent.log`   | the script | the agent's output                               |

```sh
scripts/agent-loop/run.sh 52          # up to 30 iterations
scripts/agent-loop/run.sh 52 10       # up to 10
AGENT_CMD='codex exec --sandbox workspace-write -' scripts/agent-loop/run.sh 52
```

The agent works on the branch `loop/issue-<n>`. Its sandbox keeps `.git`
read-only, so it leaves its change in the tree with a message in `COMMIT`, and
the script commits after the iteration (the commit-msg hook still checks the
message). When it
writes `DONE`, the script pushes the branch (the pre-push hook runs the full
checks) and opens a draft pull request. When it writes `STOP`, the script
prints the question and exits with status 2; answer in `.loop/<n>/task.md` or
on the issue, delete `STOP` and run the script again: it continues the same
branch and keeps `progress.md`.

Only tasks with a measurable goal fit a loop. Each issue for a loop names the
goal, the commands that measure it, and the decisions that stay with the
author. The rules for every iteration are in [prompt.md](prompt.md).
