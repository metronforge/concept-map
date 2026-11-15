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

release-please writes `CHANGELOG.md` from the merged pull requests. **Every
pull request ends with a `## Changelog` section holding the exact entries**
between `BEGIN_COMMIT_OVERRIDE` and `END_COMMIT_OVERRIDE`; release-please
reads that block from the pull request instead of parsing the squash commit.

Why: the squash commit carries the whole description, and release-please's
parser trips on ordinary prose (a line such as
`` `var(--cmap-layer-<id>,var(--cmap-layer))` `` made it drop the main entry of
#7 and read the `Co-authored-by:` trailer as a change). The block is the only
reliable input.

```text
## Changelog

BEGIN_COMMIT_OVERRIDE
feat!: add format 3 maps with generic layers and inline text

BREAKING CHANGE: maps must use format: 3 and declare their layers; format 2
is not read. See docs/FORMAT.md.

feat: add source-map validation and JSON Schema without geometry
END_COMMIT_OVERRIDE
```

- One Conventional line per user-visible change, a blank line between
  entries. The first line is normally the pull request title.
- A breaking entry has `!` and a `BREAKING CHANGE:` paragraph directly after
  it, saying what users must change.
- Pull requests with no user-visible change (`docs`, `test`, `refactor`,
  `ci`, `build`, `chore`) still end with the block, holding only the title.
- The two marker words appear only once in the description, in this block:
  release-please takes the text after the first occurrence.
- Only `feat`, `fix`, `perf` and breaking entries appear in the changelog.
- Write entries for a reader of the changelog: what the user gets, not
  which task item it was.
- A wrong entry after merge: edit the block in the merged pull request; the
  open release pull request picks it up on the next push to `main`.
- Do not merge the release pull request (`chore(main): release …`) yourself;
  the author decides when a version is complete.

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
