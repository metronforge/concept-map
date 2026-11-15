# Release automation evidence

Item 1 of [0.2.0](../tasks/0.2.0.md), implementing [ADR 0012](../adr/0012-automated-releases.md).
Run date: 2026-11-15. Base: `e12e39c`; implementation:
`45f742aaa8ce72fd8115940ec368d4d8b952dd8e` on `feat/release-automation`.

## Branch dry run

release-please **17.11.2**, Node **24.12.0**. Command (Bash/Zsh, credential
passed by file descriptor and never recorded):

```sh
npx release-please@17.11.2 release-pr \
  --token <(gh auth token) \
  --repo-url=metronforge/concept-map \
  --target-branch=feat/release-automation \
  --dry-run
```

Reads the pushed branch's config/manifest and finds the existing `v0.1.1`
release at `9a315304cabc9be67172acc3d9e824004593e7df`.

Exit code: **0**. [Full CLI output](release-automation-dry-run.txt).

Preview observed:

```text
Would open 1 pull requests
fork: false
title: chore(feat/release-automation): release 0.2.0
branch: release-please--branches--feat/release-automation--components--concept-map
draft: false

## [0.2.0](https://github.com/metronforge/concept-map/compare/v0.1.1...v0.2.0) (2026-11-15)
### Features
* automate releases (45f742a)
```

The Node strategy proposes version/changelog updaters for `package.json`,
`package-lock.json`, `CHANGELOG.md` and `.release-please-manifest.json`, plus its
optional `npm-shrinkwrap.json`, `samples/package.json` and `changelog.json`
updaters (those files do not exist in this repository).

The old non-Conventional commit `ed82177` is reported as unparseable and skipped;
this is existing history, not a dry-run error. The preview correctly uses the
new `feat: automate releases` commit to propose 0.2.0. No PR, tag, GitHub Release
or npm publication was created. Version files remain at 0.1.1 in this branch;
the future release PR owns their updates.

## Checks

- `actionlint` **1.7.12**: all workflows passed.
- `npm run verify`: passed, including all 48 unit tests, architecture/contract
  guards, schema/API freshness, package validation and size limit (9.7 kB).
- Local browser run: all **104 Chromium/Firefox tests passed**. All 52 WebKit
  tests could not launch because this workstation lacks `libavif.so.16`.
  A direct `webkit.launch()` reproduced the missing-library error before any
  application code ran. The GitHub workflow installs browser OS dependencies.
- Repository pre-push hook: full verify and **52 Chromium tests passed**.
- Full GitHub CI: [implementation run](https://github.com/metronforge/concept-map/actions/runs/43710681297).
- Independent review: no blocking or important findings. The partial
  release-please failure recovery case was added to RELEASING.md.

Version-policy probes used the installed release-please `DefaultVersioningStrategy`
and `parseConventionalCommits`, with flags read from the committed config:

| Commit title            | From  | Result |
| ----------------------- | ----- | ------ |
| `feat: add layout`      | 0.1.1 | 0.2.0  |
| `fix: restore focus`    | 0.1.1 | 0.1.2  |
| `feat!: change format`  | 0.1.1 | 0.2.0  |
| `fix(dom)!: change API` | 0.1.1 | 0.2.0  |

Title probes used the upstream v6 `validatePrTitle` function with `types` read
from `pr-title.yml`. For direct Node execution only, its JSON import was given
`with {type: 'json'}` (the distributed Action bundles that import).

- Accepted: `feat: automate releases`, `fix(dom): restore focus`,
  `feat!: change format`, `fix(dom)!: change API`, `chore(main): release 0.2.0`.
- Rejected: `Automate releases`, `unknown: change API`, `feat:`.

## Review limits and handoff

The dry run validates release planning; it does not exercise an actual release
merge or npm OIDC publication. Those occur only after the author merges the
implementation PR and later the generated release PR. `pull_request_target`
uses the default branch's configuration, so the new title check takes effect
once merged. Repository settings and bot-PR merge handling are in RELEASING.md.

Suggested implementation PR title: **feat: automate releases**.
Include this evidence link in the PR body. Stop after item 1; item 2 is untouched.
