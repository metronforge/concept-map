# Ordered spacing between fixed boxes

The channel candidate meets all four of the author's numeric routing targets
on the original 29 maps. This is an experiment result, not visual acceptance
or production integration. The [decision report](decision.md) returns the
choice to the author; libavoid remains deferred.

| Measure                   | Before spacing | After spacing | libavoid | Channel target |
| ------------------------- | -------------: | ------------: | -------: | -------------: |
| Pair-weighted shared line |        2654.25 |        201.00 |   145.50 |        ≤291.00 |
| Hard defects              |              3 |             3 |        3 |             ≤3 |
| Routes outside viewport   |              0 |             0 |        0 |              0 |
| Crossings                 |             17 |            20 |       23 |            ≤23 |
| Bends                     |            302 |           302 |      304 |              — |
| Route length              |       41198.99 |      41154.99 | 38762.99 |              — |
| Router gzip bytes         |           1237 |          3855 |   200989 |              — |

Fourteen placed maps change: dagre coffee; ELK coffee, door and gcd; and book
0-1, 2-2, 2-4, 2-6, 3-1, 4-1, 4-4, 4-6, 5-2 and 6-1. All other channel maps,
all reference and libavoid geometry, and both aligned-box channel drawings
remain identical. The original corpus still has 260 edges; aligned inputs
remain a separate six-edge comparison. Reading reports are unchanged.

## Coordinate assignment

`routeIndependent` retains the bounded shortest-path search. The earlier
[branch-order](track-order.md) and [bend-coupling](track-coupling.md) reports
still examine those independent paths. `routeChannel` now passes them to
`spaceChannels` before the common annotation stage.

Compatible components keep their coupled orders. For a conflicting component,
a single greedy pass considers already assigned bend neighbours, then low-end
and high-end branch constraints. A rule that would close a cycle is omitted;
there is no further search for contradictory join orders. Each run receives
its own rank. The omitted rule is allowed to become a crossing at its join,
as the author requested. Existing compatible-order search still has factorial
worst-case growth; this small corpus has at most four runs in a group.

Each group gets up to four SVG units between adjacent tracks, reduced to fit
half the available distance toward the nearest node boundary or viewport edge.
The corridor spans the group's full longitudinal extent. Terminal supporting lines stay
fixed: one pinned run anchors the ranks; multiple pinned runs keep the group
on its old coordinate. Shared corners are reconstructed from the horizontal
and vertical track coordinates together, not by independent offset trials.

A final geometry guard checks exact ports, permitted sides, closed node boxes,
viewport bounds and positive progress along each original segment. If the
assignment fails, the whole map retains its independent routes. This is a
conservative fallback, not proof of impossibility. No affected corpus map
uses that fallback. The guard does not reject inter-route coincidence or
crossings; the independent overlap audit and `check()` measure those afterwards.
A nearby noncoincident route can become coincident after spacing on other inputs.
Missing search paths and inputs without viewport bounds
retain the independent-search result.

This is distinct from the rejected local shift trial: track orders are chosen
jointly before coordinates, and no inclusive-intersection heuristic substitutes
for actual crossing counts. The unchanged `check()` judges the resulting map.

## Crossings and remaining shared runs

Book 0-1 loses two crossings. Book 3-1, 4-4 and 5-2 each gain one; book 4-6
gains two. Other maps keep their crossing counts. These five added crossings
are included in the total of 20, not discounted as unavoidable.

All remaining shared spans are on terminal runs. Keeping their supporting lines
fixed avoids moving a port but leaves coincidence until the first bend.
Adjoining bends can slide along those lines, changing the terminal-run length.
Separating them further requires fan-out bends near the fixed terminals.
The spans include arrivals and departures at the same port, not just parallel
arrows with identical sources. Stroke clearance is not measured by exact overlap.

| Book map | Shared edge pairs | Remaining shared line |
| -------- | ----------------: | --------------------: |
| 0-1      |                 3 |                    45 |
| 2-1      |                 1 |                     8 |
| 2-2      |                 2 |                    26 |
| 2-4      |                 1 |                    54 |
| 2-6      |                 1 |                     9 |
| 4-4      |                 1 |                    27 |
| 4-6      |                 2 |                    26 |
| 6-1      |                 1 |                     6 |
| Total    |                12 |                   201 |

The precise edge IDs and spans are in `overlap/channel/book/hand/<map>/pairs/`.
No edge retraces itself. Neither candidate shares a line in the six examples.

## Browser evidence and local pictures

The fresh comparison covers 522 drawings and 12150 states across Chromium,
Firefox and WebKit, at 1280 and 390 px. Both candidates still have zero states
with displayed hard contacts and zero horizontal overflow. Their 3784 states
with text below page text remain failures, so neither has visual acceptance.
The two aligned inputs separately reproduce 24 drawings and 120 states.

Raw narrow example hard defects rise from 115 to 152 for channel after
annotation refinement; the corresponding labels are moved into the panel.
Book raw channel defects remain 25. The unchanged checker records every band;
the zero displayed-contact count does not erase these raw defects.

Local Chromium/light pictures of all 14 changed maps are under
`/tmp/loop79-timebox-i1-pictures/`, named
`<input-id-with-hyphens>-{before,after}-{1280,390}.png` (56 files).
They show the last scenario in whole-map mode after real-font refinement.
Screenshots stay outside the repository and are not uploaded. Browser checks,
not those single-state pictures, cover every scenario step and whole-map state.

## Reproduce

With Node 26 and the locked dependencies, after `npm run build`:

```sh
node --test experiments/routing/*.test.mjs
node experiments/routing/channels.mjs docs/evidence/routing-experiment --check
node experiments/routing/quality.mjs docs/evidence/routing-experiment --check
node experiments/routing/overlaps.mjs docs/evidence/routing-experiment --check
node experiments/routing/downloads.mjs docs/evidence/routing-experiment --check
node experiments/routing/browser.mjs docs/evidence/routing-experiment --check
node experiments/routing/browser.mjs docs/evidence/routing-experiment --book --check
node experiments/routing/browser.mjs docs/evidence/routing-experiment --same-rank --check
```

Fresh reports were first written outside the repository and compared with the
previous results. Reference and libavoid browser reports reproduce unchanged.
The stored reports retain each map, contact subject and state chunk separately;
no baseline, threshold, public API, package limit or production file changed.
