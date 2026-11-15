# ADR 0018: scenarios traced from a real execution

Status: proposed for 0.3.0

## Context

Writing the flow of `gcd(48, 18)` by hand is tolerable; a binary search over a
thousand elements is not, and a hand-written run can silently disagree with
the algorithm it claims to show.

## Proposal

A separate entry `./trace`, no runtime dependency:

```js
import { recorder } from "@metronforge/concept-map/trace";

const rec = recorder();
function gcd(a, b) {
  rec.hop("input", { a, b });
  for (;;) {
    rec.hop("test", { a, b });
    if (b === 0) break;
    const r = a % b;
    rec.hop("mod", { a, b, r }, `${a} mod ${b} = ${r}`);
    [a, b] = [b, r];
    rec.hop("shift", { a, b });
  }
  rec.hop("return", { a }, `→ ${a}`);
  return a;
}
gcd(48, 18);
const scenario = rec.scenario({ id: "gcd-48-18", label: "gcd(48, 18)" });
```

- `hop(node, state?, log?)` records a visit; the edge is the one from the
  previous node to this one, named explicitly only when two edges connect
  the same pair.
- `scenario()` returns a format-3 scenario: steps (one per hop or grouped by
  marked boundaries), flow, log, state (ADR 0017), repeat badges from repeated
  edges.
- The result is checked against the map like any source map: an unknown node
  or a missing edge is an error naming the hop.
- Traces run at build time or in the browser; the recorder never touches the
  DOM.

## To decide

- Step grouping: one step per hop, per loop iteration, or explicit
  `rec.step("…")` boundaries.
- Limits: maximum hops per scenario, and how to summarise long runs.
- Whether the map itself (nodes and edges of the flowchart) can be derived
  from annotated code, or stays hand-written (proposed: hand-written, the
  structure is the author's explanation, the run is the machine's).
