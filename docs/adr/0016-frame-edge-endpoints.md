# ADR 0016: may frames be edge endpoints?

Status: proposed — awaiting the author's decision; no runtime change authorized

## Evidence and current contract

Book map `2-1` deliberately uses a frame as an edge endpoint:

```json
{
  "frames": {
    "outer": {
      "label": "OUTER LOOP · FIND THE ELEMENT",
      "box": [14, 132, 392, 370],
      "showWith": ["resolve"]
    }
  },
  "edges": {
    "timeout_outer": {
      "from": "timeout",
      "to": "outer",
      "path": "M347 60 V84 H280 V130"
    }
  }
}
```

This is an excerpt; optional edge label, badge and styling are omitted here.
The edge is shown in scenario `how`, step `one-timeout-for-both-loops`. It is not
used in any flow. The path ends at y=130, two units above the frame's top edge.
There is no node `outer`, but there is a frame `outer`. Treating this as a typo
or inventing an invisible node would lose the author's distinction.

The structural schema permits the string. The resolved renderer draws the given
path without resolving its endpoints. The new layout boundary validates endpoints
against nodes only and rejects it with `edges.timeout_outer.to: unknown node
“outer”`. Thus the hand-rendered map works, but it cannot pass through layout.
The current D7 check is correct for its node-only contract; the contract needs
an explicit decision rather than a book-specific exception.

## Options

1. **Keep endpoints node-only.** Frames remain decorative group boundaries. The
   book must remodel this relationship or its authoring adapter must translate
   it. Validation stays simple, but there is no semantically equivalent node
   endpoint in this example.
2. **Allow node or frame endpoints as strings** (recommended). Keep `from` and
   `to`, resolve each ID uniquely across nodes and frames, and reject ambiguous
   references. This preserves the book's existing vocabulary and representation.
3. **Use explicit tagged endpoints**, such as `{ "frame": "outer" }` and
   `{ "node": "timeout" }`. This avoids cross-namespace ambiguity, but changes
   public types and map syntax. A migration rule and format/version decision
   would be required before implementation.

Allowing frame endpoints only on hand-resolved maps is not recommended: it would
make the source and resolved semantic contracts disagree (ADR 0011).

## Proposed semantics if option 2 is approved

- An edge may connect node→node, node→frame, frame→node or frame→frame.
  A frame is an annotation target, not a new executable node or a lane.
- Resolve `from` and `to` against the union of node/frame IDs. Zero matches is an
  unknown endpoint; two matches is an ambiguous endpoint. Both errors include
  the full source path and ID. Do not silently prefer a node over a frame.
- Existing duplicate IDs in the two namespaces remain usable until referenced
  as an endpoint. An ambiguous endpoint requires the author to rename an ID.
  This compatibility restriction must be described in the implementing PR.
- `show`, `current`, `flow.node`, concept node lists, callouts and `showWith`
  remain node-only. `steps.edges` continues to reference edges of either kind.
- Preserve current frame visibility based on `showWith`; merely showing an edge
  does not implicitly reveal a frame or its nodes. Authors must reveal the
  relevant trigger node when they want the frame visible.
- Keep `flow.node` node-only. Initially reject flow edges that touch frames with
  a path-specific error: animation semantics for visiting a group have not been
  defined. The book example is unaffected because it uses no such flow.
- `showWith` means visibility triggers, not complete group membership. Do not
  infer containment, nesting or compound-engine constraints from that list.

## Proposed layout treatment and acceptance criteria

For fully resolved maps, validate endpoint existence/ambiguity and preserve all
hand geometry exactly, including the book's deliberate two-unit arrow gap.

For source maps, keep node-to-node edges in the existing engine graph. Resolve
frame geometry using the current frame-sizing policy, then route frame-touching
edges against the resulting node/frame boxes in a separate deterministic pass.
Such edges do not affect engine ranking. This avoids pretending that the engines
already implement identical compound-node behavior. The follow-up implementation
must define boundary attachment and routing for overlapping/nested frames, empty
frames and self-edges; it must reject unsupported cases clearly rather than emit
invalid geometry. It must not silently substitute `showWith[0]` as the endpoint.

Approval of the endpoint concept does not select an engine or settle those routing
choices. Before coding, the implementation proposal must make each case above
concrete and identify any additional schema requirement for source frame sizing.
The current sizing from `showWith` is only a proxy and cannot reconstruct the
book's full hand-authored frame from visibility triggers alone.

Required verification for a separately approved implementation:

- Node-only maps and all 1050 existing render cases remain unchanged.
- Hand-resolved map `2-1` passes layout validation and is returned unchanged;
  genuine unknown node/frame IDs still fail before measurement/engine execution.
- Unknown and ambiguous endpoints, all four endpoint combinations, visibility
  and prohibited frame flow references have targeted tests.
- Both adapters remain interchangeable, with I10 covering supported source frame
  cases and explicit failures for any unsupported cases. No engine quality or
  default decision is inferred from these contract tests.

## Decision requested

The author chooses node-only endpoints, node-or-frame string endpoints, or tagged
endpoints, and confirms whether the proposed visibility and flow restrictions are
acceptable. Until then, retain the validator, fixtures and rendering as they are.
This ADR does not start task 0.2.0 item 4 and contains no engine comparison.
