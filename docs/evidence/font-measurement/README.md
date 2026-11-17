# Text measured in the player

These reports use the package stylesheet and default page fonts at 1280 px and
390 px viewports. The 390 px reports are in the `390/` directory. They come from `check(source, player.map, { measureLabel:
domMeasurer(player.root) })` after fonts load. The test visits every scenario,
step and whole-map view and checks that the SVG uses the map's label and
number positions, and that the SVG fits its host. The JSON contains full reports, measurements and the ids
of moved labels and numbers. Server quality baselines are unchanged.

## Measurement uncertainty

Hard-defect identities agree in all three browsers. The DOM adapter supplies
an allowance of 1/64 of the rendered font size for Euclidean boundary
measurement error. This is a chosen typographic allowance, not a proven bound
for arbitrary fonts. The checker adds the allowances of both text blocks in
a contact. It reports `clear` or `defect` only when the entire gap interval
qualifies; otherwise it reports `tight`. Each contact retains its nominal gap
and its uncertainty in em. Font-table reports retain zero uncertainty. The allowance applies only to
contacts involving text; step numbers against boxes or other numbers stay exact.

For example, the door/dagre `close` label against its own route measures
−0.099 em in Chromium and WebKit and −0.101 em in Firefox. All three intervals
cross the −0.1 em cutoff, so all report `tight`. No label centre, route or
checker cutoff was moved to obtain agreement. The checker remeasures text;
it never trusts the resolved map's saved uncertainty.

| Map    | Engine | Font table | Each browser at 1280 px | Each browser at 390 px |
| ------ | ------ | ---------: | ----------------------: | ---------------------: |
| coffee | dagre  |          1 |                       1 |                      5 |
| coffee | ELK    |          0 |                       0 |                      6 |
| door   | dagre  |          3 |                       5 |                     18 |
| door   | ELK    |          1 |                       4 |                     31 |
| gcd    | dagre  |          6 |                       6 |                      6 |
| gcd    | ELK    |          6 |                       6 |                      6 |

## Narrow-width corrections

The narrow check exposed two measurement errors: an estimated baseline and
SVG glyph-cell bounds being treated as painted ink. The adapter now reads the
baseline with a DOM marker and measures glyph ink with the browser's canvas
text metrics, matching the font and shaping settings. It adds half the stroke
width explicitly. Wrapped lines are measured at their individual baselines.
The checks include a delayed font with 150% size adjustment.

Exact measured paint decides whether a number must move. Rounded clearance
is used only after that decision, when searching for a new position. A number
with a positive gap remains where it was. The paint regression tests call the
same checker with independently measured ink, zero tolerance and zero
uncertainty, and reject deliberately injected collisions. The old one-pixel
minimum could move an already-clear number; these tests now enforce the
specified no-overlap rule instead. SVG glyph-cell boxes are not used as ink.

## Additional defects

The page enlarges arrow text when the diagram shrinks into its column. Text
measured at that actual CSS size can reach routes which the 10.5-unit table
estimate did not reach. Labels retain their centres, and routes stay fixed.
The records' `extraDefects` arrays name every new contact.

For door with dagre, `lock` reaches the `unlock` route and `finish` reaches
`close`. The three existing line/label contacts remain. The former
`open`/`close` number overlap at 1280 px clears with the corrected paint
measurement. Number-to-number avoidance belongs to the next
placement stage; this item retains the existing candidate search.

For door with ELK, `close`, `lock` and `unlock` reach their own routes, and the
`open` and `unlock` numbers overlap after clearing measured labels. The old
`lock`/`unlock` number overlap clears. Other examples keep their existing
hard-defect lists at 1280 px. [Every additional narrow-width contact](390/README.md)
is listed with its cause. Fixing those route/label and number/number contacts
remains outside this measurement change.

## What moves

Every changed arrow-label anchor and step number is listed in `moved`.
Label anchors retain the same measured text-block centre at the new size.
Numbers move when they cover measured labels, painted text or node boxes.
Paint clearance rounds up to the existing four-unit candidate spacing so
subpixel paint extents do not select different positions unnecessarily.
The exact, unrounded paint bounds are used to decide whether to move.
Clear numbers retain their positions; conflicts between numbers remain in
the report. Gcd's repeated passes move with its loop number.

Node boxes, lanes, frames, paths and view boxes remain byte-identical. The
six server hashes retain their original values after excluding only the
new `measurement` metadata. Before/after pictures are kept outside Git.

Reproduce the reports with:

```sh
FONT_EVIDENCE_DIR=/tmp/font-reports npx playwright test test/browser/refine.spec.ts
```

Each test also attaches its JSON report to the Playwright results.
