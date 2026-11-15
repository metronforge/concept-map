# ADR 0019: node shapes and nesting

Status: proposed for 0.3.0

## Context

UML state machines need pseudostates (initial ●, final ◉, choice ◇) and
composite states that contain other states. Today every node is a rectangle,
and frames mean "shown together", not "contains" (ADR 0016). The door example
of 0.2.0 shows the gap.

## Proposal

- Node `shape`: `box` (default), `rounded`, `circle`, `bullseye`, `diamond`,
  `bar` (fork/join). Shapes change drawing and the box size the measurer
  asks for; ports and flow stay the same.
- Node `parent`: the id of a composite node. Layout lays children out inside
  the parent (ELK compound nodes; dagre `setParent`), the parent's box is
  derived from its children. Edges may end on a composite node's border
  (as frames do in ADR 0016).
- Revealing a child reveals its ancestors; flow may enter and leave a
  composite node.

## To decide

- Whether `parent` replaces frames for containment, leaving frames as a
  visual grouping only, or frames become composite nodes.
- Depth limit and how dagre's weaker compound support affects the default
  engine (item 4 of 0.2.0 should record compound capability).
- Parallel regions and history states: out of scope here.
