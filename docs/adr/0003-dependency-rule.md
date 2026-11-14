# ADR 0003: one dependency rule, enforced by tools

Status: accepted (approved by the author by merging the pull request that set this status)

## Decision

`schema ◄ model ◄ render ◄ dom`, no cycles, core without DOM types, ports
without DOM types, `.` exports the core and `./dom` the shell.

Enforcement, all in CI:

- `dependency-cruiser` with the rule set in the repository;
- `tsconfig.core.json` with `lib: ["ES2023"]` over `schema`, `model`,
  `render`, `dom/ports`;
- `publint` and `@arethetypeswrong/cli` for the entry points.

Stage A ships one entry point `.` (debt D6); the split is stage B.

In stage A the rule set runs with the known violations listed as
exceptions (ARCHITECTURE §7). An exception is removed in the pull request
that fixes it; adding one needs an ADR.

Rejected: a hand-written import test (the book has one today): it checks
less and nobody reads its failures.
