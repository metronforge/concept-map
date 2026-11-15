# Releasing

[ADR 0012](docs/adr/0012-automated-releases.md) defines the release policy.
Versions and changelog entries come from release-please; npm publishing uses
GitHub Actions trusted publishing in `.github/workflows/release.yml`.
No npm token or local publishing is needed.

## Contributor workflow

1. Open a pull request with a Conventional Commits title, for example
   `feat: add automatic layout`, `fix: restore keyboard focus`, or
   `feat!: change the map format`. Optional scopes work too: `fix(dom): …`.
   The **Validate PR title** check rejects invalid titles and reruns when the
   title changes or commits are pushed. It reads metadata only, including for
   forks; it never checks out PR code.
2. Squash-merge with the PR title as the commit title. Before 1.0, `feat` and
   breaking changes (`!`) bump the minor version; `fix` bumps the patch.
   Other non-breaking types such as `docs`, `test`, `refactor` and `chore`
   do not by themselves request a release. Do not edit versions or create tags
   by hand.
3. Each push to `main` runs release-please, which maintains one release PR.
   Review its version, changelog, `package.json`, `package-lock.json` and
   `.release-please-manifest.json`, then squash-merge it when ready to release.
4. The resulting push makes release-please create `vX.Y.Z` and a GitHub Release.
   In that **same workflow run**, the full CI (`npm run verify` and Playwright
   in Chromium, Firefox and WebKit) checks the released SHA. Only on success
   does the publish job build that SHA, check the tag against `package.json`,
   and run `npm publish --access public` with OIDC.
5. Check the Release workflow and the version's provenance on
   [npm](https://www.npmjs.com/package/@metronforge/concept-map).

An ordinary push that only updates the release PR does not run the publish
jobs. The bot uses `GITHUB_TOKEN`: its PR and release events do not start other
workflows. That is why publishing is in the same run, not a separate
`release: published` workflow. The bot release PR may have no CI or title-check
run; the full CI still gates publishing after it is merged.

## Repository settings

- Settings → Actions → General → Workflow permissions: enable **Allow GitHub
  Actions to create and approve pull requests**. The workflow grants write
  access only to the release-please job.
- Settings → General → Pull Requests: enable squash merging and use the
  **pull request title** as the default squash commit title. Use squash merging
  for this release policy; merge/rebase commits can carry different messages.
- Protect `main` from direct pushes. Require **Validate PR title** for contributor
  PRs alongside the existing CI checks. The title workflow uses
  `pull_request_target`, so it takes effect after this configuration reaches
  `main`. Account for the bot release PR's absent checks: the author must use
  the repository's permitted merge/bypass procedure for that PR, after reviewing
  its generated files. Do not disable contributor checks to release.
- npm package → Settings → Trusted Publisher: GitHub Actions,
  `metronforge/concept-map`, workflow **release.yml**, publishing allowed.
  Keep this filename: the trusted publisher is bound to it.
- npm package → Publishing access: require 2FA and disallow tokens.

## If a run fails

- **release-please cannot open a PR:** check the Actions setting above and its
  job permissions. Fix the cause, then rerun the failed job.
- **CI or publishing fails after the GitHub Release exists:** npm may not have
  received the version yet. For a transient failure, use **Re-run failed jobs**
  on the original run, retaining the successful release-please job and its
  outputs. Do not rerun all jobs: release-please will see the existing release
  and will not emit `release_created` again, so publishing will be skipped.
- **The tag/version check or a real CI defect fails:** investigate the exact
  released SHA. Fix through a new PR and let release-please propose the next
  version. Do not move an existing release tag to newer code.
- **`npm publish` fails with 404 or 403:** check the trusted publisher's repository
  and workflow filename, and the publish job's `id-token: write` permission.
- **A retry says the version already exists:** check npm and provenance first;
  the previous attempt may have published successfully. Never replace a
  published version. Ship a fix in the next version; deprecate a broken version
  if needed.

## Dry run before enabling

On a pushed feature branch or fork, run the CLI with `--dry-run` (use a GitHub
credential from `gh auth token` via a file descriptor, not a literal token in
the command line; the example uses Bash or Zsh):

```sh
npx release-please@17 manifest-pr \
  --token <(gh auth token) \
  --repo-url=metronforge/concept-map \
  --target-branch=feat/release-automation \
  --dry-run
```

This reads that branch's config and manifest and previews the release PR without
creating a PR, tag, GitHub Release or npm version. Record the command, CLI
version, branch SHA, proposed version/files and validation results in the
implementation PR. This verifies release planning, not OIDC publication; the
first real publish is verified after the author merges a release PR.

Implementation evidence: [release automation dry run](docs/evidence/release-automation.md).
