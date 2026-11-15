# ADR 0017: a state panel for flow hops

Status: proposed for 0.3.0

## Context

An algorithm is understood through its variables changing: `a = 18, b = 12,
r = 6`. Today values can only be written into step text and log lines, where
the reader has to compare them by eye. The GCD example of 0.2.0 shows the
gap.

## Proposal

- A flow hop may carry `state`: an ordered record of name → value (string,
  number, boolean, or a short list), the values **after** the hop.
- The panel shows the current state as a small table; values changed by the
  last hop are highlighted, the previous value is shown on demand. Reduced
  motion: no transition, the highlight stays.
- The screen-reader status announces only the changed names and values.
- In step mode the panel shows the state at the end of the step's last hop.

## To decide

- Whether a scenario declares its variables up front (fixed table rows,
  stable layout) or rows appear as values first occur.
- Value types beyond scalars and short lists; anything structural belongs to
  the "scene" renderer, not here.
- Interaction with `log`: keep both (log = narration, state = values).

## Consequences

Format 3 gains an optional field (minor version). Invariants: state names are
stable within a scenario; the panel after hop k equals the fold of hops 1..k.
