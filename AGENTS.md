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
- Every pull request targets `main`. Never target another pull request's
  branch: if work depends on a pull request that is not merged yet, wait for
  the merge, rebase on `main`, then open the pull request. A pull request
  aimed at another branch merges into that branch, and its change never
  reaches `main`.

### Plain language

Titles, descriptions, commit messages and changelog entries are read by
people who have not seen our planning documents. Write what changed and why
in ordinary words.

- Say what is different afterwards, not what kind of edit it was.
  `renumber the proposed ADRs to 0018-0020` says nothing;
  `docs: plan a state panel, traced runs and node shapes` does.
- No internal references in titles or changelog entries: no ADR numbers,
  task item numbers, debt or invariant codes (D7, I10), file names of
  planning documents.
- Descriptions are self-contained. Explain a decision in a sentence instead
  of pointing to the document that holds it; a reader must understand the
  pull request without opening anything else. Links are for evidence a
  reader may want to check (a page with results, a CI run), not for the
  explanation itself.
- Short sentences, common words, no jargon that the change does not need.
- English everywhere: code, docs, examples, fixtures and the comparison
  pages. This is an international project. Other scripts appear only in tests
  that check Unicode handling, such as label measurement.

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

## Visual acceptance

A change that can alter what a reader sees (rendering, layout, CSS, the
player, the examples) is accepted on pictures, not only on numbers.

- **Checks on the examples in all three browsers** (Chromium, Firefox,
  WebKit), in every step of every scenario and in whole-map mode:
  - no arrow label is crossed by a line, a box or a step number;
  - no step number covers a label or a box;
  - no self-transition loop or label touches another box;
  - map text is not smaller than the page text and not more than 1.25 times
    larger; a wide map shrinks to the container without horizontal
    scrolling at 390 px.
    Positions are measured in the browser with real fonts after
    `document.fonts.ready`; font tables are an estimate for server rendering,
    never the proof.
- **Pictures only where the drawing changes, and only for the author.** When
  the drawing is proven unchanged (identical resolved maps, unchanged quality
  baseline), make none. When it changes, save before and after of the examples
  that changed (one browser, 1280 px, light theme; 390 px only when the narrow
  presentation changes, dark theme only when colours or CSS change) outside the
  repository and give their paths to the author. Do not upload them to GitHub
  and do not keep a pull request in draft for them. Never commit screenshots,
  and do not add tests whose only job is to take them; the browser checks above
  are the proof.
- A check that passes in one browser and fails in another is a failure. Do
  not open a pull request until CI is green in all three.
- Do not relax a visual check or regenerate a snapshot to make a change
  pass; explain the difference in the description instead.

## Evidence files

Recorded evidence (`docs/evidence/`) follows the same rules as code: small
files with one subject each.

- One file per report, in folders that say what it is (for example
  `browser/<browser>/<example>-<engine>-<width>.json`), the way the test or
  script writes it. Do not concatenate reports into one large file.
- No evidence file over 500 lines. When a run produces many reports, add a
  short summary file (or a table in the folder's README) beside them.
- Keep the README of the folder in step: what each file is and how to
  reproduce it.

## Size limits

`.size-limit.js` holds one gzip budget per way of using the package.

- When a change needs a limit to rise, set it to the measured size plus a
  margin of at most 1 KB and at most 3% of the measured size, whichever is
  smaller (about 1 KB for the component and layout, 400 B for the player,
  130 B for server rendering). A larger margin hides the next change that
  should have been noticed.
- A rise of more than 1 KB for one limit needs the author's approval, written
  in the issue or the pull request. Say by how much and why in a comment next
  to the limit and in the description.
- Prefer making the code smaller: one shared implementation instead of two.

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
so write it as one. The plain-language rules apply to commits too.

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
