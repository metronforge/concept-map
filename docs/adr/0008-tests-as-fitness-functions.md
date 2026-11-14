# ADR 0008: tests as fitness functions

Status: accepted (approved by the author by merging the pull request that set this status)

- Each invariant of ARCHITECTURE §6 is one named property; the name carries
  the number (`I4 revealed grows with the step`).
- One model-based test (`fc.commands`) compares `MapPlayer` on fake ports
  with the fold of `reduce`.
- Mutation testing (Stryker) on `model` and `render` runs in CI weekly and
  on demand. The threshold is the first measured score, rounded down; it
  may only be raised.
- Browser tests run in Chromium, Firefox and WebKit and assert the DOM
  contract table. They do not re-test what a unit test covers; each browser
  test names the reason it needs a browser.
- Golden snapshots of the old player stay as the behaviour oracle until
  format 3.

Rejected: a line-coverage threshold. It rewards executing code, not
checking it.
