# Work needed before a channel router can ship

The experiment now demonstrates bounded path finding and ordered parallel
spacing on 29 placed maps. It meets the author's numeric routing targets;
[the spacing report](spacing.md) records the changes and remaining shared
terminal runs. This is evidence for selecting a router, not permission to
integrate it into the package.

## What the prototype establishes

All 260 edges retain exact ports and sides, avoid closed node boxes and stay
inside their fixed viewports. The result is deterministic on this corpus.
There are 3 hard annotation defects, 20 crossings, 302 bends and 201 units of
pair-weighted shared line across 12 edge pairs in eight maps. The two extra
aligned-box inputs retain their earlier drawings and satisfy alignment.

Shared runs receive coupled orders and coordinates together. Conflicting
joins allow counted crossings. A conservative geometry guard keeps the
independent routes if the assignment fails. All 14 changed corpus maps use
the new spacing. No claim of completeness or optimal coordinates follows.

## Effort by missing capability

These classes describe engineering uncertainty, not delivery dates.

| Capability                     | Evidence and missing work                                                                                                                                                                                                                                                       | Effort                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Separate shared terminal stems | Terminal supporting lines remain pinned; adjoining bends can change lengths; eight maps retain 201 units of overlap. Fan-out bends must preserve exact ports and sides without adding contacts.                                                                                 | Bounded prototype extension, then corpus and broader geometry checks.   |
| Guarantee visible clearance    | Four-unit spacing shrinks in narrow channels. Exact noncoincidence does not guarantee separation of strokes, markers or text at display scale.                                                                                                                                  | High; needs paint-aware constraints and presentation work.              |
| Handle general inputs          | Short legs and moved corners can invalidate an assignment; the whole map then keeps independent routes. Nearby routes can become coincident after spacing; the guard does not check inter-route contacts. Dense maps, shared ports, loops and scaled coordinates need coverage. | Unmeasured beyond these small inputs.                                   |
| Choose ports from source maps  | Current inputs recover fixed terminals from old routes. Source maps need supplied or chosen ports, including gaps, corners, loops and frames.                                                                                                                                   | Bounded for supplied ports; automatic port choice remains unmeasured.   |
| Control runtime growth         | Every edge builds a grid; searches scan boxes. Compatible ordering may enumerate permutations. Cyclic joins use a single greedy fallback.                                                                                                                                       | Profile larger inputs before choosing data structures or search limits. |
| Report failures precisely      | A failed graph search or rejected spacing assignment does not prove the map impossible.                                                                                                                                                                                         | Bounded contract work at the future routing port.                       |

Spacing, annotation and presentation interact. Lower overlap alone would not
justify the change: the report also measures crossings, contacts, bounds and
browser states. The checker's thresholds and bands remain unchanged.

## Shared annotation and presentation work

Both candidates still put labels over node step numbers for `ma` in book
3-2, `releaseOne` in 3-3 and `throws` in 5-1. Shared annotation placement needs
further work. Reference maps retain their authored annotations, so their
14 defects versus the candidates' 3 are not a routing-only improvement.

Route centre lines fit the viewport, but complete paint bounds remain
unverified. Book 0-1 can clip badge circles at the boundary. Marker tips,
stroke widths and glyph bounds also require a separate audit.

All three browsers cover every step and whole-map state at both widths.
Both candidates have zero states with displayed hard contacts, but each has
3784 states with text below page text across the original 29 maps. The channel
raw narrow example hard total increases to 152; panel presentation hides those
labels. These retained failures prevent a claim of visual acceptance.

Production work must preserve the placement/routing/annotation/reporting
boundaries, unchanged scenario meaning and the independent checker. No public
routing API, literal `free` support or sketch feature is added here.

## Download and libavoid tradeoff

The measured channel runtime now includes ordering, spacing and the geometry
guard: 3855 gzip bytes, against libavoid's 200989 bytes for adapter, JS and WASM.
Shared annotations, reporting, player, fonts and CSS are excluded from both.
The sums of 29 warm map medians are 19.73 ms and 13.40 ms. These measurements
exclude loading and do not establish a statistically significant advantage.

Libavoid has 145.50 units of shared line, 23 crossings and the same three hard
defects. Its adapter still depends on a corpus-tested buffer for two-unit
port gaps and narrow corridors. General attachments, optional loading and
load failures need work. Its distribution obligations and missing rebuild
and replacement evidence are recorded in the [licence assessment](licences.md).

The author has deferred libavoid. The channel result supports continuing with
a separate production proposal, subject to the limitations above and the
author's review of the [decision report](decision.md).

## Reproduction

The [README](README.md), [spacing](spacing.md), [quality](quality.md),
[browser](browser.md), [book-browser](book-browser.md) and
[performance](performance.md) pages give the checks and their scope.
Use `--check` to reproduce stored facts without overwriting them. This
assessment changes no drawing or production implementation.
