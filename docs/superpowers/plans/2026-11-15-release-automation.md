# Release automation implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan.

**Goal:** Complete item 1 only, then stop for author review.

**Architecture:** ADR 0012 already selects release-please. Check PR metadata
without executing PR code; create releases on main pushes; verify and publish
the released SHA in the same workflow.

**Tech stack:** GitHub Actions, release-please v4 action, Node 24, npm trusted publishing.

**Spec:** [Task 0.2.0, item 1](../../tasks/0.2.0.md),
[ADR 0012](../../adr/0012-automated-releases.md).

## Constraints and review focus

- Work on `feat/release-automation`; no main push, PR creation or real publish.
- Keep `release.yml` as the trusted publisher; full CI precedes npm publish.
- Check renamed PRs and fork PR metadata; never execute fork code with privileges.
- Start at 0.1.1; breaking changes and features bump minor, fixes bump patch.
- Ordinary pushes must not publish; CI and publish must use the same released SHA.
- Document required checks, bot PR checks and failed-publish recovery.

## Steps

- [x] Read architecture, ADR 0006 and ADRs 0010–0012; confirm clean base e12e39c.
- [x] Run baseline unit tests (48 passing).
- [x] Add title check, release-please config/manifest and same-run publish chain.
- [ ] Rewrite RELEASING.md, including settings and retry instructions.
- [ ] Validate workflow syntax, version policy, full verify and browser tests.
- [ ] Push feature branch and dry-run release-please against it; retain evidence.
- [ ] Review the diff, commit evidence, push the branch and stop after item 1.
