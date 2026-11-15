# Contributing

Pull request titles, commit messages and the changelog follow
[AGENTS.md](AGENTS.md); the rules there apply to people as well as agents.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the decision records in
[docs/adr/](docs/adr/) first. Known debt is listed in
[docs/DEBT.md](docs/DEBT.md).

## Checks

```sh
npm ci                 # also installs the pre-push hook
npm run verify         # format, lint, types, dependency rule, unit tests, API report, budgets, package
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
npm run test:mutation  # report only; weekly in CI
```

The pre-push hook runs `verify` and the Chromium browser tests. CI runs Node 24
and all three browsers. In a sandbox with another Chromium build set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

## Provenance of the code

The player was extracted with its history from the book _The Illustrated
Playwright_ (metronforge-site-dev `81af868`) with git-filter-repo. The extraction
log is [docs/LOG.md](docs/LOG.md).

`test/fixtures/book-maps.json` holds the 23 maps of the book, exported once
by a script in the book repository:

```sh
cd illustrated-playwright
node scripts/export-concept-maps.mjs /path/to/concept-map/test/fixtures/book-maps.json
```

`test/fixtures/render-golden.json` freezes 1,050 rendered outputs from before
the extraction. It is a regression oracle and is never regenerated from this
library.

## Releases

See [RELEASING.md](RELEASING.md).
