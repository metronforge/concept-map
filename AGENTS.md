# Rules for coding agents in this repository

This file is the single source of instructions for every coding agent:
Codex, Claude Code, Cursor, GitHub Copilot and others read `AGENTS.md`.
Do not add tool-specific copies. If one tool ever needs extra rules, its own
file imports this one (for Claude Code: a `CLAUDE.md` whose first line is
`@AGENTS.md`) and adds only the difference.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the ADRs in
[docs/adr/](docs/adr/) before changing code. The current task is under
[docs/tasks/](docs/tasks/).

## Pull requests

`main` accepts only squash-merged pull requests. **The pull request title
becomes the commit on `main` and the line in the changelog**, and
release-please computes the version from it. So the title is part of the
work, not a formality.

- Open the pull request yourself (`gh pr create --title "…" --body "…"`).
  If you cannot, end your report with the exact title and body to paste.
- Title: `type: summary` or `type(scope): summary`, lower case after the
  colon, imperative, no period, at most 72 characters.
- One pull request per task item. Do not push to `main`.

### Choosing the type

The type says what changes **for a user of the package**, not what kind of
files you touched.

| Type             | Use when                                                                              | Release          |
| ---------------- | ------------------------------------------------------------------------------------- | ---------------- |
| `feat`           | a user can do something new: an API, an option, a format field, an entry point        | minor            |
| `fix`            | published behaviour was wrong and now is right                                        | patch            |
| `feat!` / `fix!` | a user must change their code or maps (renamed export, format change, removed option) | minor before 1.0 |
| `perf`           | same behaviour, measurably faster or smaller                                          | patch            |
| `docs`           | README, docs/, ADRs, tasks, evidence                                                  | none             |
| `test`           | tests and fixtures only                                                               | none             |
| `refactor`       | internal structure, no change visible to users                                        | none             |
| `ci`             | workflows, release automation                                                         | none             |
| `build`          | package.json scripts, tsconfig, bundling, guards                                      | none             |
| `chore`          | anything else that users never see                                                    | none             |

Examples from this repository:

- `ci: automate releases with release-please` — not `feat`: users of the
  package get nothing new.
- `feat!: format 3 without book vocabulary` — maps written for format 2
  stop working.
- `feat: add <concept-map> custom element`
- `refactor(dom): move ports out of the adapters` — debt D4, invisible to
  users.
- `docs: record the engine comparison`

When a pull request mixes types, split it. If it cannot be split, use the
type with the largest effect on users.

## What goes into the changelog

release-please writes `CHANGELOG.md` from the squash commits on `main`. The
squash commit is the pull request **title and description** (repository
setting), so:

- **The title is the changelog line.** Write it for a reader of the
  changelog: `feat: add <concept-map> custom element`, not
  `feat: item 5`.
- **More user-visible changes in one pull request:** add one Conventional
  line per change at the end of the description, each on its own line:

  ```text
  feat: add mount() for hosts without custom elements
  fix(dom): keep focus on the scenario button after a step
  ```

  Each becomes its own changelog entry.

- **Breaking change:** `!` in the type, and a footer explaining what users
  must change:

  ```text
  BREAKING CHANGE: maps must declare their layers; format 2 is not read.
  ```

- Only `feat`, `fix`, `perf` and breaking changes appear in the changelog.
  `docs`, `test`, `refactor`, `ci`, `build` and `chore` are kept in the git
  history only.
- Do not start any other line of the description with `type:`; it would be
  read as a change. Put commands and logs in code blocks.
- A wrong entry after merge: edit the merged pull request's description and
  add the corrected lines between `BEGIN_COMMIT_OVERRIDE` and
  `END_COMMIT_OVERRIDE`; release-please uses them instead of the commit.

## Commits on a branch

Commit messages are checked by `.githooks/commit-msg` with the same format.
They are squashed away on merge, but the first one usually becomes the title,
so write it as one.

## Pull request body

Use [.github/pull_request_template.md](.github/pull_request_template.md):
what changes for users, why, evidence (commands and results), what was not
done and why.

## Working plans

Do not commit working plans, execution ledgers or skill-workflow files under
`docs/superpowers/` (or elsewhere in the repository). Describe the implementation
plan in the pull request instead. Keep temporary planning notes outside the
tracked repository. Architecture decisions and reproducible verification
evidence belong in their established documentation locations.
