# Routing experiment: return the completed comparison to the author

Recommend the channel router for the next, separately authorised production
proposal. Ordered spacing now meets all four numeric targets on the original
29 placed maps: shared line 201 ≤291, hard defects 3 ≤3, outside routes 0,
and crossings 20 ≤23. The runtime is 3855 bytes gzip. Libavoid remains deferred
as the author requested. No feature work or default-router change is included.

This completes the requested spacing comparison in the first of the eight
additional time-box iterations. It does not make either candidate ready to
ship: browser text-size failures, shared terminal stems, paint bounds and
broader-input handling remain explicit. The author decides whether these
limits are acceptable before work on `free` or sketches begins.

## Comparison on the same boxes and ports

Coffee, door and gcd use both dagre and ELK placements; 23 book maps keep their
hand positions. Both routers replace all 260 routes at the same 520 terminals,
including two self-loops and one frame endpoint. Every exact port and side is
preserved; independent audits find no unwanted node contact or route outside
the fixed viewport. Reference and libavoid geometry remain unchanged.

| Measure, original 29 maps          | Current routes |  Channel | libavoid |
| ---------------------------------- | -------------: | -------: | -------: |
| Hard defects                       |             14 |        3 |        3 |
| Crossings                          |             20 |       20 |       23 |
| Bends                              |            307 |      302 |      304 |
| Route length, SVG units            |       43783.75 | 41154.99 | 38762.99 |
| Edge pairs sharing orthogonal runs |             14 |       12 |       12 |
| Pair-weighted shared length        |         486.00 |   201.00 |   145.50 |
| Candidate routes outside viewport  |    Not audited |        0 |        0 |
| Sum of 29 warm map medians, ms     |   Not measured |    19.73 |    13.40 |

The [quality reports](quality.md) preserve all label, step and line contacts
by band, plus per-map reading shares. Reading reports remain identical because
the checker measures direction between unchanged node centres. Both candidates
retain the same three label/node-step defects in book 3-2, 3-3 and 5-1.
The reference keeps authored annotations; candidates share a fresh annotation
pass, so the reduction from 14 to 3 is not solely a routing improvement.

Crossings exclude coincident segments. The separate [overlap audit](overlap.md)
measures those segments exactly, including shared stems. The reference has
20 diagonal segments excluded from that audit. These are separate measures;
there is no combined score.

## What spacing changes and leaves shared

The [spacing report](spacing.md) documents joint track coordinates and the
fallback for contradictory joins. Shared line falls from 2654.25 to 201 units,
while crossings rise from 17 to 20. Five added crossings in book 3-1, 4-4, 4-6
and 5-2 are counted; two crossings disappear in book 0-1. No threshold changes
or crossing exemptions are used.

Fourteen channel drawings change. All six examples now have zero shared line.
Remaining coincidence is on fixed terminal runs: book 0-1 has 45 units; 2-1
has 8; 2-2 has 26; 2-4 has 54; 2-6 has 9; 4-4 has 27; 4-6 has 26; 6-1 has 6.
Their exact edge pairs and spans are retained. Separating these stems requires
extra fan-out bends near ports; exact noncoincidence alone would not establish
visible stroke clearance in a narrow drawing.

The branch includes the aligned-box feature from main. The two additional
[same-rank inputs](same-rank.md) remain separate from the original totals.
Their channel drawings are unchanged: no hard defects, crossings, shared line
or outside routes. Compared with stretching, channel adds two bends and 37.21
units on dagre placement; ELK counts and length match although a segment moves.

## Browser results and visual limits

The fresh [example](browser.md) and [book](book-browser.md) measurements cover
522 drawings and 12150 states, with every scenario step and whole-map state
at 1280 and 390 px in Chromium, Firefox and WebKit after pinned fonts load.
The aligned comparison separately reproduces 24 drawings and 120 states.

| Browser measure, original corpus    | Current | Channel | libavoid |
| ----------------------------------- | ------: | ------: | -------: |
| States with displayed hard contacts |     210 |       0 |        0 |
| States with text below page text    |    3989 |    3784 |     3784 |
| States above 1.25 times page text   |       0 |       0 |        0 |
| Drawings with horizontal overflow   |       0 |       0 |        0 |

These are not visual-acceptance passes. Panel presentation hides some labels
whose raw reports retain defects. Channel's raw narrow example hard defects
increase from 115 to 152 after spacing and annotation refinement; libavoid
has 148. Channel book raw defects remain 25. The reports retain subpixel
text-size shortfalls as well as substantial ones without rounding into a pass.

Paint-bound review is incomplete. Book 0-1 can clip badge circles; marker tips,
strokes and glyph bounds have not been audited throughout the corpus. A route
inside the viewport is not proof that all its paint fits. Standard package
browser tests protect existing behavior, not acceptance of these experimental
drawings. Pictures and the unchanged measurement bands do not waive these gaps.

Local Chromium/light before/after pictures for all 14 changed maps, at both
widths, are in `/tmp/loop79-timebox-i1-pictures/`. Filenames and scope are in
[spacing](spacing.md#browser-evidence-and-local-pictures). None are committed
or uploaded.

## Download, time and distribution

| Browser asset                      | Minified bytes | Gzip bytes |
| ---------------------------------- | -------------: | ---------: |
| Channel implementation and adapter |           9844 |       3855 |
| libavoid adapter                   |            799 |        493 |
| libavoid library JavaScript        |          59889 |      21846 |
| libavoid WASM (unchanged binary)   |         476036 |     178650 |
| libavoid total                     |         536724 |     200989 |

Channel is repository MIT code, with ordering, spacing and the geometry guard
included and no third-party runtime. It grows by 2618 gzip bytes from the
independent-path prototype; libavoid remains 197134 bytes larger. These router
measurements do not change package size limits. Both exclude shared preparation,
annotations, reporting, player, CSS and fonts. Exact measured downloads match
all 260 Node routes in all three browsers.

[Timing](performance.md) records one warm-up and five routing calls per map,
alternating candidate order. The table sums map medians, not whole-corpus-run
medians. Loading, WASM compilation, annotations and rendering are excluded.
The data does not establish startup performance or a significant speed advantage.

The existing [licence assessment](licences.md) identifies libavoid-js
0.5.0-beta.6 as LGPL-2.1-or-later and records required notices, corresponding
source/build materials and a workable replacement or relinking arrangement.
Separate loading is demonstrated; source-to-binary rebuilding and modified
library replacement are not. No complete source distribution or compliance
proof is supplied. The author has deferred that download and distribution work.

## Decision boundary and reproduction

The [production-effort report](production-readiness.md) covers remaining
terminal fan-outs, stroke clearance, general port choice, dense inputs, failure
reporting and runtime growth. Compatible-order search can still enumerate
permutations; the conflicting-join fallback does not continue that search.
The numeric target supports the next design decision, not immediate shipping.

Stop here for the author's decision. Recommend keeping libavoid deferred and
using the channel result as the basis of a separate routing integration proposal,
with presentation and geometry limitations stated in that proposal.

The [README](README.md) and linked reports give reproduction commands. Use
Node 26 with locked dependencies. Fresh experiment measurements were first
written outside the repository, audited, then copied as the changed comparison.
Reference maps, libavoid geometry, source files, public contracts, package size
limits and existing production baselines are unchanged. All three browser
reference/libavoid report sets reproduce byte-for-byte in parsed JSON.
