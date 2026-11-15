# Releasing

Releases are published to npm by GitHub Actions (`.github/workflows/release.yml`)
through npm trusted publishing. Nobody publishes from a laptop and no npm token
exists.

## Steps

1. **Version pull request.** On a branch, set the new version and date the
   changelog:

   ```sh
   npm version 0.1.2 --no-git-tag-version
   ```

   Move the "Unreleased" notes in `CHANGELOG.md` under `## 0.1.2 — <date>`.
   Open the pull request; merge it when CI is green.

2. **GitHub Release.** On
   [Releases → Draft a new release](https://github.com/metronforge/concept-map/releases/new):
   tag `v0.1.2` (create it on publish, target `main`), title `0.1.2`,
   **Publish release**.

3. **Check.** The workflow runs the full CI (three browsers), checks that the
   tag equals `v` + the version in `package.json`, and runs `npm publish`. The
   version appears on
   [npm](https://www.npmjs.com/package/@metronforge/concept-map) a few minutes
   later, with a provenance badge.

## If the workflow fails

- **Tag does not match the version:** delete the Release and its tag, fix the
  version on `main`, release again.
- **CI fails:** nothing was published. Fix on `main` with a pull request, then
  delete and recreate the Release.
- **`npm publish` fails with 404 or 403:** check the trusted publisher on
  npmjs.com (package → Settings): repository `metronforge/concept-map`,
  workflow `release.yml`.

A version on npm cannot be replaced. A broken release is fixed by the next
version; `npm deprecate` marks the broken one.

## Settings this relies on

- npm package → Settings → Trusted Publisher: GitHub Actions,
  `metronforge/concept-map`, `release.yml`, `npm publish` allowed.
- npm package → Publishing access: 2FA required, tokens disallowed. Manual
  publishing from a laptop is still possible in an emergency (`npm publish`
  confirmed with the passkey), but is not the procedure.
