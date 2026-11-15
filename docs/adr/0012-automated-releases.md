# ADR 0012: versions and changelog by release-please

Status: accepted for 0.2.0

## Context

Releases need a version decision and a changelog. A person forgets; an AI
agent decides differently each time. The decision should follow from the
merged changes by fixed rules that a reviewer can check.

## Decision

- Pull request titles follow Conventional Commits: `feat: …`, `fix: …`,
  `docs: …`, `refactor: …`, `test: …`, `chore: …`; `!` after the type for a
  breaking change. A CI check rejects other titles. Pull requests are
  squash-merged with the title as the commit message.
- `release.yml`, on every push to `main`, runs release-please. It keeps one
  open release pull request with the next version in `package.json` and the
  new `CHANGELOG.md` section, built from the merged titles.
- Merging the release pull request makes release-please tag `vX.Y.Z` and
  create the GitHub Release. The same workflow run then runs the full CI
  and `npm publish` through trusted publishing.
- Before 1.0: a breaking change raises the minor version, `feat` the minor,
  `fix` the patch (`bump-minor-pre-major`).

Publishing stays in `release.yml` for two reasons: events created with the
workflow's own token do not start other workflows, and the npm trusted
publisher is bound to this file name.

Rejected: Changesets (one more file per pull request to write by hand);
semantic-release (publishes on every merge, no review point); an AI agent
choosing versions (not reproducible).

## Consequences

- The author's part of a release is merging the release pull request.
- CI does not start on the release pull request (created with the workflow
  token); it only changes the version and the changelog, and the publish job
  runs the full CI before `npm publish`.
- Repository settings: Actions may create pull requests; squash merge uses
  the pull request title. RELEASING.md describes the procedure.
