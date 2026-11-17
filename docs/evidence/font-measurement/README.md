# Text measured in the player

These reports use the package stylesheet and default page fonts at a 1280 px
viewport. They come from `check(source, player.map, { measureLabel:
domMeasurer(player.root) })` after fonts load. The test visits every scenario,
step and whole-map view and checks that the SVG uses the map's label and
number positions. The JSON contains full reports, measurements and the ids
of moved labels and numbers. Server quality baselines are unchanged.

## Measurement uncertainty

Hard-defect identities agree in all three browsers. The DOM adapter supplies
an allowance of 1/64 of the rendered font size for Euclidean boundary
measurement error. This is a chosen typographic allowance, not a proven bound
for arbitrary fonts. The checker adds the allowances of both text blocks in
a contact. It reports `clear` or `defect` only when the entire gap interval
qualifies; otherwise it reports `tight`. Each contact retains its nominal gap
and its uncertainty in em. Font-table reports retain zero uncertainty.

For example, the door/dagre `close` label against its own route measures
−0.099 em in Chromium and WebKit and −0.101 em in Firefox. All three intervals
cross the −0.1 em cutoff, so all report `tight`. No label centre, route or
checker cutoff was moved to obtain agreement. The checker remeasures text;
it never trusts the resolved map's saved uncertainty.

| Map    | Engine | Font table | Chromium | Firefox | WebKit |
| ------ | ------ | ---------: | -------: | ------: | -----: |
| coffee | dagre  |          1 |        1 |       1 |      1 |
| coffee | ELK    |          0 |        0 |       0 |      0 |
| door   | dagre  |          3 |        6 |       6 |      6 |
| door   | ELK    |          1 |        4 |       4 |      4 |
| gcd    | dagre  |          6 |        6 |       6 |      6 |
| gcd    | ELK    |          6 |        6 |       6 |      6 |

## Additional defects

The page enlarges arrow text when the diagram shrinks into its column. Text
measured at that actual CSS size can reach routes which the 10.5-unit table
estimate did not reach. Labels retain their centres, and routes stay fixed.
The records' `extraDefects` arrays name every new contact.

For door with dagre, `lock` reaches the `unlock` route and `finish` reaches
`close`. The first clear candidates for the `open` and `close` numbers overlap
each other after moving away from enlarged labels. The three existing
line/label contacts remain. Number-to-number avoidance belongs to the next
placement stage; this item retains the existing candidate search.

For door with ELK, `close`, `lock` and `unlock` reach their own routes, and the
`open` and `unlock` numbers overlap after clearing measured labels. The old
`lock`/`unlock` number overlap clears. Other examples keep their existing
hard-defect lists.

## What moves

Every changed arrow-label anchor and step number is listed in `moved`.
Label anchors retain the same measured text-block centre at the new size.
Numbers move when they cover measured labels, painted text or node boxes.
Paint clearance rounds up to the existing four-unit candidate spacing so
subpixel paint extents do not select different positions unnecessarily.
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
