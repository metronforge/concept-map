# Track order before channel spacing

The experiment now derives an order for coincident straight runs from their
entering and leaving branches. This is a separate, executable part of spacing;
`routeChannel` does not call it yet. No route, label, box or viewport changes.
The author's shared-line target remains unmet at 2654.25 units against 291.00.

| Branch-order result                                  | Original 29 maps | Two aligned maps |
| ---------------------------------------------------- | ---------------: | ---------------: |
| Edges examined                                       |              260 |                6 |
| Maps with shared runs                                |               15 |                0 |
| Shared-run groups                                    |               35 |                0 |
| Participating straight segments                      |               78 |                0 |
| Entrance/exit constraints                            |               72 |                0 |
| Groups with an order satisfying those constraints    |               31 |                0 |
| Groups whose order is unique under those constraints |               25 |                0 |
| Groups with conflicting constraints                  |                4 |                0 |

The six non-unique orders are deterministic choices, not proof that the
unspecified connections are safe. The four conflicts are explicit directed
cycles. No successful order is returned for them. These counts describe
constraints on current runs, not successful separation or visual acceptance.

## Method and boundaries

`experiments/routing/channel-tracks.mjs` joins positively overlapping segments
on the same exact line into groups. A chain of overlaps forms one group;
point contacts alone do not. Straight intermediate vertices are removed.
Arrow direction does not affect the geometric order. Failed, diagonal and
zero-length routes are refused rather than omitted.

For each overlapping pair, `channel-order.mjs` examines the two ends of their
shared interval. If one route continues straight while the other branches
towards smaller perpendicular coordinates, the branching route must take the
smaller track; a branch towards larger coordinates needs the larger track.
Opposite branches at the same join determine an order in the same way.
Each constraint records the segment indices, join coordinate and interval end.

Topological sorting returns indices towards increasing perpendicular
coordinate: top to bottom for horizontal runs, left to right for vertical runs.
When several segments are available, geometry then edge name breaks the tie.
A cycle records the ordered indices of contradictory constraints, closing on
its first index. An independent test checks every link against the constraints.

This step assumes one constant track per current straight run. It does not
reserve physical space or connect the shifted tracks to their fixed ports.
Ports and same-side coincident bends supply no local ordering constraint.
Orders must still be coupled around shared bends; nearby noncoincident lines
also need clearance checks. A cycle means this fixed-run model cannot satisfy
all its branch orders. It does not prove the map cannot be routed without a
crossing: extra bends, other channels or changed join positions may resolve it.

## Conflicts to resolve before moving tracks

| Map      | Horizontal channel | Opposing pair in the recorded cycle |
| -------- | -----------------: | ----------------------------------- |
| Book 3-1 |            y = 347 | `cr`, `cn`                          |
| Book 4-4 |            y = 417 | `dispatch_fresh`, `failed_stop`     |
| Book 4-6 |            y = 306 | `body_after`, `fixture_teardown`    |
| Book 5-2 |             y = 97 | `toList`, `toBlob`                  |

For example, in book 5-2 the join at x = 170 requires `toBlob` above `toList`,
while x = 190 requires the reverse. Giving each of these straight runs a
different constant height cannot satisfy both. This identifies a concrete
problem for the next routing change instead of silently choosing an offset.

The next spacing work must connect track orders across bends, preserve exact
ports, fit tracks between obstacles and viewport boundaries, and handle these
four conflicts. It must then pass the unchanged geometry and quality checks.
No local segment-shifting heuristic or checker threshold has been introduced.

## Files and reproduction

Run with Node 26 from the repository root after `npm run build`:

```sh
node experiments/routing/orders.mjs /tmp/routing-track-order
node experiments/routing/orders.mjs docs/evidence/routing-experiment --check
node --test experiments/routing/channel-order*.test.mjs
```

- `track-order/<input-id>/summary.json`: input and unchanged-route hashes,
  edge count and order counts for one map.
- `track-order/<input-id>/group-<index>.json`: one shared-run group, its
  segment geometry and branch sides, constraints, order or cycle.
- `track-order/original.json` and `aligned.json`: separate corpus totals,
  Node version and root lock hash.

In group reports, axis 0 is horizontal and axis 1 is vertical; `coordinate`
is the perpendicular coordinate. Segment `low` and `high` are branch signs
(-1, 0 or 1); `null` denotes a terminal. Order and cycle entries index that
group's `segments` array, not the map's edges. Segment numbers refer to the
route after straight intermediate vertices are removed.

Tests independently enumerate all six track orders for each of 192 three-run
branch arrangements, measure transverse branch/track intersections and compare
the valid orders with the solver's result and uniqueness claim. Corpus tests
cover all 42 edge pairs from the existing overlap audit, preserve every route
hash and verify invariance under arrow reversal and input permutation.

The existing eight measurement commands still reproduce their reports without
changes. Channel remains at 3 hard defects, 17 crossings, 302 bends, 41198.99
units of route length and no outside routes. The measured router download
remains 2526 minified bytes / 1237 gzip bytes; this separate ordering module is
not included until integrated. Libavoid remains 200989 gzip bytes. No timing
refresh or pictures are needed for unchanged implementations and drawings.
