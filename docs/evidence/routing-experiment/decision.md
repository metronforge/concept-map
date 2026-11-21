# Routing comparison for the author's decision

The author has deferred libavoid: its download and distribution work are too
large for this package now. Continue the channel experiment with ordered
parallel spacing and routes contained in the fixed viewports. Neither
candidate is ready to ship; no production integration is authorised here.

The channel candidate is incomplete and does not meet the author's target.
On the original 29 maps, shared line must fall from 2654.25 to at most 291.00
units (twice libavoid's 145.50). The [bounded search](viewport.md) now keeps
all routes inside the viewport and reduces crossings from 19 to 17.
Hard defects equal libavoid's three; crossings are below its 23.
These are separate conditions, not a combined score.

The [track-order step](track-order.md) now derives branch constraints for all
35 shared-run groups. The [joint-order step](track-coupling.md) connects them
through six shared bends: 29 groups receive compatible orders, while four
conflicting components block six groups. It does not move routes. Conflicting
joins, available space and connections to fixed ports remain unresolved.
The comparison numbers and the unmet shared-line target below are unchanged.

The branch includes the aligned-box feature from current main. The additional
[same-rank comparison](same-rank.md) covers both engines' aligned boxes and
stretched routes separately, keeping the original 29-map totals comparable.

## What the measurements establish

All 29 inputs retain their placed boxes: coffee, door and gcd with both dagre
and ELK placement, plus 23 hand-placed book maps. Both candidates replace all
260 routes using the same 520 fixed terminals, including two self-loops and
one frame endpoint. Independent geometry checks find no routing failure,
changed terminal, wrong attachment side or unwanted node contact.

| Measure, all 29 maps                        | Current routes | Channel prototype | libavoid |
| ------------------------------------------- | -------------: | ----------------: | -------: |
| Hard defects                                |             14 |                 3 |        3 |
| Crossings                                   |             20 |                17 |       23 |
| Bends                                       |            307 |               302 |      304 |
| Route length, SVG units                     |       43783.75 |          41198.99 | 38762.99 |
| Edge pairs sharing orthogonal runs          |             14 |                42 |       12 |
| Pair-weighted shared length, SVG units      |         486.00 |           2654.25 |   145.50 |
| Candidate routes outside the fixed viewport |    Not audited |                 0 |        0 |
| Sum of 29 warm routing medians, ms          |   Not measured |             28.95 |    20.82 |

The [quality report](quality.md) retains label, step and line contacts by band
and per-map reading shares. Both candidates' reading reports equal the
reference because the checker measures direction between unchanged node
centres. Their remaining hard defects are labels touching node step numbers
in book maps 3-2, 3-3 and 5-1. The reference retains its original annotations;
the candidates use the same fresh annotation pass. The 14-to-3 reduction is
therefore not evidence of a routing-only improvement.

Crossings exclude coincident runs. The [shared-line audit](overlap.md) exposes
those separately, including shared stems at identical ports; it does not say
that every shared run can be removed. The reference also has 20 diagonal
segments excluded from that audit. No aggregate score combines these facts.

The [timings](performance.md) use one warm-up and five measured calls per
map/candidate. The table sums the individual medians; it is not a corpus-run
median. Loading, WASM compilation, annotations and rendering are excluded.
The timings do not establish browser startup performance or a statistically
significant speed advantage. They describe the recorded implementations only.

## Browser results and remaining drawing work

The [example](browser.md) and [book](book-browser.md) reports cover every
scenario step and whole-map state at 1280 and 390 px in Chromium, Firefox and
WebKit, after the pinned fonts load. Together they contain 522 drawings and
12150 states: 4050 states for each route set.

| Browser measure, both widths and all three browsers  | Current | Channel | libavoid |
| ---------------------------------------------------- | ------: | ------: | -------: |
| States with displayed hard contacts                  |     210 |       0 |        0 |
| States with measured text below page text            |    3989 |    3784 |     3784 |
| States with measured text above 1.25 times page text |       0 |       0 |        0 |
| Drawings with horizontal overflow                    |       0 |       0 |        0 |

Zero displayed contacts is not visual acceptance. Panel presentation hides
some arrow labels whose raw reports retain defects. The text checks include
visible node titles and arrow labels, not every category of text. Exact
subpixel shortfalls are retained alongside substantial failures; results are
not rounded into a pass across browsers.

Paint-bound review is incomplete. Neither candidate's route centre lines now
leave the viewport. Both can place badge circles beyond it in book 0-1.
Marker tips, strokes and glyph bounds have not been audited across the corpus.
The viewport and text-size problems require shared presentation work and are
not solved by choosing libavoid. Standard browser tests passing establishes
that this experiment has not broken the package; it does not certify these
experimental drawings.

## Download and distribution tradeoff

The [download reports](performance.md#browser-download) count the minified
browser JavaScript and the separate, unchanged WASM binary, compressed
individually with gzip level 9. The adapter is included.

| Browser asset                      |  Bytes | Gzip bytes |
| ---------------------------------- | -----: | ---------: |
| Channel implementation and adapter |   2526 |       1237 |
| libavoid adapter                   |    799 |        493 |
| libavoid library JavaScript        |  59889 |      21846 |
| libavoid WASM                      | 476036 |     178650 |
| libavoid total                     | 536724 |     200989 |

Channel is repository MIT code with no third-party runtime. Its small payload
does not include the missing spacing algorithm. The measured libavoid runtime
adds 199752 gzip bytes over that unfinished prototype. Both totals exclude
shared preparation, annotations, reporting, player, fonts and CSS.

The [pinned licence assessment](licences.md) identifies libavoid-js
0.5.0-beta.6 as LGPL-2.1-or-later. It records the notices, corresponding
source/build materials and workable replacement or relinking arrangement a
distributor needs. Separate JS/WASM loading is demonstrated in all three
browsers; a source-to-binary rebuild and modified-library substitution are
not. This experiment supplies neither a complete source distribution nor
proof of release compliance. That work remains part of the author's choice;
the library does not become MIT when used by this package.

## Choice and follow-up boundary

The [production-effort assessment](production-readiness.md) finds the main
channel uncertainty in joint routing: consistent track ordering through
turns, available channel width and connections back to fixed ports. A working
spacing pass must preserve port/node audits and measure crossings, contacts
and viewport bounds together. Its delivery time, final size and speed are
unknown. More coverage of the current independent paths cannot establish that
missing capability.

Libavoid already supplies joint routing, but its current adapter still needs
general attachment handling beyond the corpus's two-unit gaps and narrow
corridor. Both choices need annotation, clipping and text-size work, explicit
failure handling and verification beyond these small fixed inputs.

The next step is ordered channel spacing with endpoint connections, followed
by the full comparison, updated downloads and an explicit report of whether
all four target conditions hold. The earlier independent segment-offset trial
reduced shared lines but added crossings; it was rejected and is not the
chosen approach. Do not treat the current 1237-byte prototype as a completed
spacing implementation.

The two additional aligned layouts have no shared runs to separate. Channel
adds two bends and 37.21 units of route length on dagre's placement. ELK's
counts and length match stretching, though one horizontal segment moves.
Both satisfy the same-rank constraint.
This extends the inputs but does not improve the original corpus or finish
the spacing work. Report back for the author's decision when that comparison
is complete; the existing paint and text-size gaps remain explicit.

## Evidence integrity and reproduction

Viewport containment changes only two channel routes. Reference and libavoid
geometry remain unchanged; shared inputs now include copied viewport bounds.
The comparison records fresh geometry, quality, timing, download and browser
measurements, with the aligned-box inputs kept separate.
The [README](README.md#files-and-reproduction) and linked measurement reports
give the commands and their scope. Use Node 26, locked dependencies and the
`--check` commands for geometry, quality, overlap, downloads and both browser
corpora. These compare recorded facts without rewriting them. Experiment tests
also verify the stored five-sample timing arithmetic and route/input hashes.

Earlier local example pictures are at `/tmp/loop79-run1-pictures/` in the
author's workspace, outside the repository. They show server annotations at
1280 px in Chromium/light, not browser acceptance. The aligned comparison's
local pictures are documented in its report. A changed implementation needs fresh
quality, timing, download and browser measurements and the required pictures.
