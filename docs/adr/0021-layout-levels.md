# ADR 0021: four levels of layout, from automatic to hand-placed

Status: accepted (author, 2026-11-15). The open questions below are settled
while building relative placement, each with its own record.

## Context

The engine comparison showed that the hand-drawn maps read best, although they
have the most edge crossings and the largest number of bends. Both engines
minimise crossings and area; neither knows what the author meant:

- the coffee shop reads left to right (guest → cashier → barista), and both
  engines turned it top to bottom, one of them with the barista on top;
- the main path of a scenario should run straight, and return arrows should go
  around it;
- boxes that belong together should line up in a row or a column.

A hand layout carries this intent. Its cost is that every box needs
coordinates and every arrow a path.

Typesetting systems solved the same problem long ago, and their ideas fit here:

- **MetaPost and Metafont** describe positions by equations ("`z2` is 3 cm to
  the right of `z1`", "`z3` is halfway between them") and let a solver find
  the coordinates. The relations are the intent.
- **TikZ** places nodes relative to each other (`right=of guest`), in a grid
  (`matrix`) or in a chain, and offers automatic graph layout for the rest.
- **TeX** uses glue: distances that may stretch within limits, chosen by
  minimising "badness".
- **Cassowary**, the linear constraint solver behind Apple's Auto Layout,
  solves such relations with priorities: required ones always hold, preferred
  ones as far as possible.

## Proposal

An author chooses per map, and may mix within a map, four levels:

1. **Automatic.** An engine (dagre or ELK) places everything. Good for large
   maps and first drafts.
2. **Hints for the engine.**
   - `direction`: `down` or `right`.
   - Model order: nodes are kept in the order the map lists them where the
     engine allows it (ELK has this option; dagre only partly).
   - Main path: the flow of the first scenario is laid out as straight as
     possible (higher edge priority in ELK, higher weight in dagre). We know
     the story; the engine does not.
3. **Relative placement.** A node says where it is relative to others, never
   in pixels:

   ```json
   "cashier": { "label": "Cashier", "layer": "staff", "at": { "rightOf": "guest" } },
   "barista": { "label": "Barista", "layer": "staff", "at": { "rightOf": "cashier" } },
   "milk":    { "label": "Out of milk", "layer": "staff", "at": { "below": "barista", "alignX": "barista" } }
   ```

   Relations: `rightOf`, `leftOf`, `above`, `below` (each with an optional
   `gap`), `alignX` and `alignY` (same column or row), or a grid position
   `row` / `column`. A small linear constraint solver (Cassowary as
   `@lume/kiwi`, BSD-3-Clause, about 3.8 kB gzip) turns them into
   coordinates. Required: the stated relations and no overlap along a stated
   relation. Preferred: compactness and equal gaps. Nodes without `at` are
   placed by the engine around the fixed ones, or rejected if no engine is
   given.

4. **Hand-placed.** Boxes and paths given, as in the book. Kept unchanged.

Precedence for a node: hand-placed, then relative, then hints, then the
engine. A map can be laid out once at build time and shipped resolved, so the
browser loads neither solver nor engine.

In the architecture this is one more adapter behind the same layout port
("constraints"), and a few optional fields in the source map. The player does
not change.

## Measures

Crossings and area did not predict what reads well. The comparison page adds:

- **reading order**: the share of main-path steps that go in the stated
  direction;
- **label overlaps**: labels over boxes or over other labels;
- **alignment**: boxes that share a row or a column with a neighbour.

## To decide

- **Edge routing after relative placement.** Orthogonal routing around fixed
  boxes is the hard part. Options: route in the channels between grid rows and
  columns (simple, limited to grid-like maps); let ELK route with fixed node
  positions; write a small router for the cases we need. To be measured on
  the three examples before choosing.
- **Non-overlap** is not a linear constraint in general. Proposal: require it
  only along stated relations, and check the result; report a clear error
  instead of producing overlapping boxes.
- **What the default is.** Likely relative placement for small maps (the
  three examples), the engine for large ones. To be decided on the comparison
  page, with relative placement as a fourth column for the coffee shop, the
  door and Euclid's algorithm.
- Whether `row` / `column` and relations may be mixed in one map.

## Consequences

- The engine decision of 0.2.0 becomes "which level is the default, and which
  engine for level 1".
- Source maps gain optional fields (`direction`, `at`); a map without them is
  laid out exactly as today.
- One new optional dependency (the solver), loaded only by its adapter.
