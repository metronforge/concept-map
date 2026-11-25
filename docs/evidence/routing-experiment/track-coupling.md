# Track orders through shared bends

This report describes the stage before ordered spacing. Its numeric comparison
is historical; [spacing](spacing.md) records the current result. Order and
coupling commands still use independent paths so these diagnostics reproduce.

The experiment now connects the [branch orders](track-order.md) across
coincident right-angle turns. The new `coupleChannels` function chooses orders
for connected groups together. It does not move routes itself; `routeChannel` now consumes its orders
through the spacing pass. Independent paths have 2654.25 shared units; the target is 291.00.

| Joint-order result                         | Original 29 maps | Two aligned maps |
| ------------------------------------------ | ---------------: | ---------------: |
| Edges examined                             |              260 |                6 |
| Shared-run groups                          |               35 |                0 |
| Maps with shared bends                     |                5 |                0 |
| Pairs of routes sharing a bend             |                6 |                0 |
| Connected components of groups             |               29 |                0 |
| Components with compatible orders          |               25 |                0 |
| Groups in those ordered components         |               29 |                0 |
| Components blocked by contradictory orders |                4 |                0 |
| Groups in those blocked components         |                6 |                0 |

The earlier branch-only result ordered 31 groups in isolation. Two of those
groups are connected to a contradictory group by a shared bend. The joint
result refuses to return a partial order assignment for either component.
This is a more complete constraint model, not a regression in route quality:
all paths and quality reports remain identical.

## Corner rule and solver

Two routes share a bend when consecutive horizontal and vertical segments
meet at the same point and extend into the same quadrant. A point touch,
opposite turn or intersection of nonadjacent segments supplies no bend link.
Each link identifies the two segments in each group and the corner coordinate.

Horizontal tracks are ordered top to bottom; vertical tracks left to right.
For a left/up or right/down corner, the two orders must agree. For a left/down
or right/up corner, they must be reversed. Otherwise one horizontal leg crosses
the other route's vertical leg after separation. Arrow direction does not
change this geometric condition.

The solver retains every entrance/exit constraint from the earlier step.
It visits connected groups in their stable geometric order, enumerates their
permitted topological orders, and adds constraints from assigned neighbours.
It backtracks when a later group cannot satisfy them. The first complete
assignment is returned; no claim of uniqueness or optimal coordinates is made.
A group with a recorded branch cycle blocks its whole connected component.
Exhaustion also returns no assignment when individually possible group orders
cannot satisfy their bend links together; a synthetic test covers this case.

Orders are only a prerequisite for spacing. Coordinates, obstacle clearance,
short segments, fixed-port connections and nearby noncoincident routes remain
unsolved. Backtracking can take factorial time on large ambiguous groups;
this experiment has at most four segments per group and two groups per
connected component. Larger inputs need a separate performance assessment.
A blocked component says these current straight runs cannot keep one constant
track each under the stated constraints. It does not prove the map unroutable.

## Observed links and conflicts

| Map      | Shared-bend pairs | Joint result at those bends                             |
| -------- | ----------------: | ------------------------------------------------------- |
| Book 0-1 |                 1 | compatible                                              |
| Book 2-2 |                 1 | compatible                                              |
| Book 3-1 |                 1 | blocked by the existing horizontal branch cycle         |
| Book 4-6 |                 2 | one compatible; one linked to the existing branch cycle |
| Book 6-1 |                 1 | compatible                                              |

The four compatible bend pairs agree with the earlier independent orders.
No new contradiction was discovered in the corpus. The four existing branch
cycles remain in book 3-1, 4-4, 4-6 and 5-2. Resolving them needs changed joins,
extra bends or different channels before all tracks can be spaced. Merely
selecting a different tie order cannot remove these cycles.

## Files and reproduction

Run with Node 26 after `npm run build`:

```sh
node experiments/routing/couplings.mjs /tmp/routing-track-coupling
node experiments/routing/couplings.mjs docs/evidence/routing-experiment --check
node --test experiments/routing/channel-coupling*.test.mjs experiments/routing/channel-bends-geometry.test.mjs
```

- `track-coupling/<input-id>/summary.json`: unchanged input/route hashes and
  joint-order counts for one map.
- `track-coupling/<input-id>/bend-<index>.json`: one bend link. Group indices
  refer to `track-order/<input-id>/group-<index>.json`; segment indices are
  local to each group's `segments` array. `sameOrder` specifies the corner rule.
- `track-coupling/<input-id>/component-<index>.json`: group indices and the
  corresponding joint orders, or `null` for the entire component. `localCycles`
  identifies groups with cycle witnesses in their original group reports.
- `track-coupling/original.json` and `aligned.json`: separate corpus totals,
  Node version and root lock hash.

Eight tests cover all four corner orientations, propagation through three
bends, backtracking, contradictions, point touches and nonadjacent segments.
An independent geometric oracle draws separated L shapes and intersects their
legs for all 144 combinations of three-track orders and corner quadrants.
Corpus tests inspect original path vertices to find all six bend links,
check every returned branch and bend constraint, and verify route preservation
and invariance under arrow reversal and input permutation.

Before integration, channel had 3 hard defects, 17 crossings, 302 bends,
41198.99 units of route length and no outside routes. Its 2526 minified / 1237
gzip bytes excluded these ordering modules. The [spacing report](spacing.md)
records the integrated result, timing, download and picture refreshes.
