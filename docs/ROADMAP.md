# Roadmap

What the library is for: **animation that makes abstract ideas easier to
grasp** — processes, protocols, state machines and algorithms, which are
dynamic by nature. A map shows the structure; scenarios replay one run of
it step by step; the flow token shows the motion.

Each version is planned in `docs/tasks/`. Items below are candidates; each
gets an ADR before work starts.

## 0.2.0 — usable outside the book (in progress)

[docs/tasks/0.2.0.md](tasks/0.2.0.md): release automation, format 3,
automatic layout, engine choice, custom element, examples in three domains
(process, state machine, algorithm).

## After 0.2.0, before 0.3.0

- Frame endpoints (ADR 0016), after the default engine is chosen.
- How hosts load and bundle a layout engine (CDN, bundler, worker,
  build-time layout), with an example for each.
- The book moves to format 3 (in the book repository).

## 0.3.0 — algorithms and state machines

- **State panel** ([ADR 0018](adr/0018-state-panel.md)): variable values for
  every flow hop, changes highlighted.
- **Trace from execution** ([ADR 0019](adr/0019-trace-from-execution.md)):
  run a real implementation with trace points and build scenarios from the
  record, so the animation cannot disagree with the code.
- **Node shapes and nesting** ([ADR 0020](adr/0020-node-shapes-and-nesting.md)):
  initial / final / choice pseudostates; composite states laid out inside
  their parent.

## Later

- Stage B debt that remains (ARCHITECTURE §7, DEBT.md).
- Parallel regions and history states in state machines.
- A second renderer, "scene", for algorithms over arrays and other data
  layouts (sorting, two pointers), driven by the same player: steps and
  scenarios stay, the picture changes. Not before 1.0.
- 1.0: contracts declared stable.
