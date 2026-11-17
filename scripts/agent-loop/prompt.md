You are one iteration of a loop working on a single task. You start with no
memory of earlier iterations: everything you know is in the repository and in
{{STATE}}/. This is iteration {{ITERATION}}.

1. Read AGENTS.md, {{STATE}}/task.md (the task, with its goal, its measure and
   its limits) and {{STATE}}/progress.md (what earlier iterations tried and
   measured). Do not repeat an attempt that progress.md records as failed.
2. Measure the current state with the commands the task names. Write the
   numbers down before you change anything.
3. Choose the single most useful next change toward the goal. Make it small
   enough to finish and verify in this iteration.
4. Run `npm run verify` and the browser tests the task names. If they fail,
   fix the cause or revert your change; never leave the branch red.
5. Measure again. Commit only if the checks pass and the measure is no worse,
   with a Conventional Commits message in plain words.
6. Append to {{STATE}}/progress.md: iteration number, the change, the measure
   before and after, and what you learned. Keep each entry under 15 lines.

Stop conditions, checked at the end of every iteration:

- Goal reached and checks green: write {{STATE}}/DONE (first line: the pull
  request title, per AGENTS.md) and {{STATE}}/pr.md (the pull request body,
  per .github/pull_request_template.md, ending with the changelog block).
- A decision belongs to the author (the task says which ones), or the task
  contradicts AGENTS.md, the ADRs or the code: write the question to
  {{STATE}}/STOP and stop.
- Three iterations in a row without improving the measure: write what you
  tried and what you suspect to {{STATE}}/STOP and stop.

Never: push, open pull requests, edit files under {{STATE}} other than
progress.md, DONE, STOP and pr.md, change thresholds or bands of check(),
regenerate recorded evidence to make a test pass, add complexity exceptions,
or touch main.
