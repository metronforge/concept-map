# Work needed for a production channel router

The channel prototype demonstrates fixed-port path finding on all 29 inputs,
not a finished routing stage. Its small download excludes several substantial
pieces of work, especially keeping neighbouring arrows separate. This report
assesses those missing pieces from the current code and recorded measurements;
it does not select a router or authorise production integration.

## What the prototype establishes

The [geometry reports](channel-geometry/summary.json) cover all 260 edges,
including two self-loops and the frame endpoint. Independent audits find no
changed port, wrong attachment side or unwanted node contact. Repeated runs
are deterministic on this corpus. Each edge uses its own channel graph and
minimises bends, then length; other edges do not influence that search.

The [quality reports](quality.md) retain 3 hard defects, 19 crossings and 302
bends. The [shared-line audit](overlap.md) adds a separate limitation: 42 edge
pairs share 2654.25 units across 15 maps. Two routes leave their fixed
viewports. Neither the crossing count nor successful path finding establishes
that arrows remain distinct or fully visible.

## Effort by missing capability

The effort classes below describe the kind of engineering still needed, not
elapsed-time estimates. **High** means a routing or presentation design remains
unproven; **bounded** means adapting an existing mechanism and verifying its
contract. A delivery date would be speculative before the high-effort parts
work on the difficult inputs.

| Capability                      | Evidence and missing work                                                                                                                                                                                                                                                         | Effort                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Separate parallel arrows        | Independent shortest paths share long runs. Routes need a consistent order across adjoining channels, space for each track, and connections back to fixed ports. Shared stems at an identical port may remain unavoidable.                                                        | High; the prototype has no joint routing stage.                               |
| Fit routes in available space   | The graph adds exterior tracks 16 units beyond coordinate extremes but receives no viewport or stroke clearance. Channel edges `retry` in book 2-3 and `clean_returned` in 4-1 leave the viewport. Track capacity and paint bounds must be considered without moving fixed boxes. | High; finding a path does not establish enough room for its drawing.          |
| Use source-defined attachments  | Both adapters currently recover exact terminals from reference paths. A production call without old routes needs to supply or choose ports from boxes and side constraints, including gaps, corners, loops and frame endpoints.                                                   | Bounded adapter work for supplied ports; automatic port choice is unmeasured. |
| Report failure precisely        | `no channel path` means the constructed graph found none. It does not prove the geometry impossible. Failure, unsupported inputs and a checked result must remain distinct at the routing boundary.                                                                               | Bounded contract work; geometric completeness is not established.             |
| Handle inputs beyond the corpus | Current tests cover fixed fixtures and a few small cases. Tight corridors, many arrows sharing a port, several adjacent loops, scaled coordinates and dense graphs need broader checks.                                                                                           | Unmeasured; those inputs may expose changes to the graph or spacing design.   |
| Control runtime growth          | Each edge rebuilds a grid from the boxes; neighbour queries scan the nodes and the priority queue inserts into an array. The recorded warm timings cover only these small maps.                                                                                                   | Profile after spacing; a shared graph or faster search may be needed.         |

These are connected costs. Separating a run can require extra bends near its
ports, consume space used by a neighbouring route, or change where annotations
fit. A smaller shared-length total is therefore insufficient: exact ports,
node avoidance, crossings, hard contacts and viewport bounds must be measured
again together. The current checker and its bands remain the acceptance basis;
the independent overlap and clipping facts supplement it.

Consistent track ordering and endpoint connections are the next unresolved
algorithmic question. A useful experiment must demonstrate separation through
turns and shared junctions, rather than only translate isolated segments.
The corpus provides concrete stress cases: channel shared length is 556 units
in book 4-4, 407 in 4-6 and 374 in 2-2. The ELK door example also has shared
runs despite having zero reported crossings. These cases are evidence for
the scope of the problem, not proof that one ordering strategy will solve it.

## Work shared by either router

Routing alone does not remove the three remaining hard defects. Both
candidates place arrow labels over node step numbers for `ma` in book 3-2,
`releaseOne` in 3-3 and `throws` in 5-1. Shared annotation placement needs
further work. The reference keeps its original annotations, so its 14 defects
versus the candidates' 3 cannot be credited to routing alone.

Paint bounds need separate attention too. In book 0-1, a channel badge is
centred at x=0; a libavoid badge is centred near x=418.5 in a 424-unit viewport.
Both have radius 8. Zero route overflow is not proof that the complete drawing
fits. Marker tips, strokes and text are outside the current route-bound audit.

The [example browser reports](browser.md) measure every scenario step and
whole-map state at 1280 and 390 px in all three browsers. Each route set has
zero displayed hard contacts, but 291 of 300 states contain text below the
16 px page size. Of those, 246 have substantial shortfalls and 45 are less
than 0.001 px below. The unchanged reference has the same result. Fixed-box
routing and moving arrow labels to the panel cannot enlarge node titles.
[Book-map browser measurements](book-browser.md) now extend that coverage;
paint-bound review remains incomplete.

Production integration must preserve the division between placement, routing,
annotation and reporting. It must also retain scenario meaning, use the
independent checker, and distinguish a routing refusal from a claim about the
map. Nothing in this experiment adds a public routing API or literal `free`
support; those changes follow the author's routing decision.

## What choosing libavoid would and would not avoid

Libavoid already routes the whole map in one transaction. It has much less
exact shared line on this corpus: 12 pairs and 145.50 units, with no shared
runs in the examples. It has 23 crossings against the channel prototype's 19,
the same 3 hard defects, and the same example text-size failures. It does not
remove the shared annotation and presentation work above.

Its [attachment notes](libavoid-geometry-notes.md) record a 2.5-unit obstacle
buffer chosen for the corpus's two-unit port gaps and six-unit corridor.
General gaps and corridors still need an attachment strategy; passing this
corpus does not establish one. Optional loading, load failures and browser
startup cost also need production treatment. Distribution preparation remains
separately assessed in the [licence report](licences.md).

The [runtime measurements](performance.md) are 1144 gzip bytes for channel
and 200989 for libavoid with its adapter, JS and WASM. These exclude shared
annotations and reporting. The channel number also excludes the missing
spacing implementation. Recorded sums of warm map medians are 28.23 ms and
20.63 ms respectively; they exclude loading and are not browser latency.
Size and timing must be measured again after implementation changes.

The channel option trades a small dependency-free starting point for unresolved
joint routing work. Libavoid supplies more of that machinery, with a larger
download and separate attachment and distribution work. Neither is ready to
ship from these measurements. Parallel channel spacing and paint-bound
review remain before the final comparison for the author.

## Reproducing the assessment

No new numeric evidence is generated here. The [README](README.md) lists the
geometry and quality checks; [overlap](overlap.md), [browser](browser.md) and
[performance](performance.md) give their additional commands. Run their
`--check` forms to compare the recorded evidence without overwriting it.
The implementation inspected is `channel.mjs`, `channel-grid.mjs`,
`channel-search.mjs`, `prepare.mjs`, `assemble.mjs`, `route-audit.mjs` and
`avoid.mjs` under `experiments/routing/`. This assessment changes no drawing.
