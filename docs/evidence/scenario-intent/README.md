# Layouts with and without scenario intent

The first scenario supplies preferred node order, main-path arrows and return
arrows to both engines. Intent is enabled by default. The comparison uses
`{ intent: false }` for the columns without those preferences. Hand drawings
are kept unchanged.

The comparison at `comparison-dist/index.html` contains 27 maps and 132 drawings:
23 book maps, the original coffee reference, and the current coffee, door and
gcd examples. Each automatic drawing has with/without-intent columns and its
server `check()` report. A hand reference appears once because intent cannot
change it; the three current examples have no hand reference.

## Results

`server/<example>.json` records each example with both intent settings, including
full quality reports, bends and areas; `server/meta.json` holds timings, bundle
sizes and build provenance. Variants ending in `-plain` are **before intent**;
other variants are **with intent**. `browser/<browser>/<example>-<engine>[-plain]-<width>.json`
holds the 72 real-font reports (three browsers × three examples × two engines ×
two intent settings × two widths), one file per report as the browser test
writes them; `browser/summary.json` lists the chosen presentation and the hard
counts of every report.

Reading below is `quality.reading.nonReturn.share`. Returns lists backward
non-self returns / all non-self returns. The door also has one self-loop;
coffee and gcd have none. The original all-arrow reading share remains in each
JSON report. Counts use unique edge/travel-direction pairs from the first
scenario, not the scenario selected in the player.

| Example | Engine | Intent | Reading | Returns | Crossings | Bends | Server hard |
| ------- | ------ | ------ | ------: | ------- | --------: | ----: | ----------: |
| coffee  | dagre  | off    |     1.0 | 1 / 1   |         1 |     5 |           0 |
| coffee  | dagre  | on     |     1.0 | 1 / 1   |         1 |     5 |           0 |
| coffee  | ELK    | off    |     0.5 | 0 / 1   |         0 |    10 |           0 |
| coffee  | ELK    | on     |     1.0 | 1 / 1   |         0 |    10 |           0 |
| door    | dagre  | off    |     1.0 | 2 / 2   |         0 |     6 |           0 |
| door    | dagre  | on     |     1.0 | 2 / 2   |         0 |     6 |           0 |
| door    | ELK    | off    |     1.0 | 2 / 2   |         0 |    14 |           0 |
| door    | ELK    | on     |     1.0 | 2 / 2   |         0 |    14 |           0 |
| gcd     | dagre  | off    |     1.0 | 1 / 1   |         0 |     4 |           0 |
| gcd     | dagre  | on     |     1.0 | 1 / 1   |         0 |     4 |           0 |
| gcd     | ELK    | off    |     1.0 | 1 / 1   |         0 |     6 |           0 |
| gcd     | ELK    | on     |     1.0 | 1 / 1   |         0 |     6 |           0 |

In Chromium, Firefox and WebKit, every complete drawing at 1280 px and every
presented drawing at 390 px has zero hard defects, with both intent settings.
The tests traverse every step of every scenario and whole-map mode after fonts
load. Full 390 px reports include arrow labels moved to the panel and are
informational: door/dagre has 2 raw hard defects with either setting;
door/ELK has 28 without intent and 17 with intent. All other raw narrow reports
have zero. These values agree across the three browsers. They are recorded,
not asserted as acceptance criteria.

The final comparison-summary iteration changes no geometry: all six default
server maps/reports and all 36 previously checked browser reports match its
baseline exactly. All 132 comparison metric profiles also match. The 23 hand
references match the existing comparison inputs; the render golden tests pass.
No recorded baseline, checker band or complexity exception was changed.

## Reproduce

Use Node 26 and the locked dependencies and browser binaries. From the repository:

```sh
npm run build
VITEST_MAX_WORKERS=2 npm_config_cache=/tmp/loop65-npm-cache npm_config_ignore_scripts=true npm run verify
FONT_EVIDENCE_DIR=/tmp/scenario-intent-browser npm run test:browser -- test/browser/refine.spec.ts test/browser/natural-size.spec.ts
npm run comparison:build
python3 -m http.server 43865 --bind 127.0.0.1 --directory comparison-dist
```

The npm cache override accommodates the loop sandbox. Ignoring lifecycle scripts
prevents the package check from configuring Git hooks. Verification passed all
561 unit tests and existing size budgets; the browser command passed 84 tests.
The comparison was also exercised in all three browsers at both widths:
80 step selections and 20 whole-map views per browser/width, 132 loaded players
and reports, correct reading/return summaries, no page overflow or script errors.

To assemble fresh evidence **outside** this recorded directory after those runs:

```python
import json
from pathlib import Path
out = Path("/tmp/scenario-intent")
report = json.loads(Path("comparison-dist/metrics.json").read_text())
(out / "server").mkdir(parents=True, exist_ok=True)
for m in report.pop("maps"):
    if m["id"] in ("coffee", "door", "gcd"):
        (out / "server" / f"{m['id']}.json").write_text(json.dumps(m, indent=2) + "\n")
(out / "server" / "meta.json").write_text(json.dumps(report, indent=2) + "\n")
for p in sorted(Path("/tmp/scenario-intent-browser").glob("*.json")):
    browser, name = p.name.split("-", 1)
    (out / "browser" / browser).mkdir(parents=True, exist_ok=True)
    (out / "browser" / browser / name).write_text(p.read_text())
```

Timings and build provenance vary; quality reports are the reproducible evidence.
The comparison previews fit each map into their columns, so their physical scale
is not the standalone 1280 px acceptance view. Server reports beside the previews
are explicitly labelled; browser evidence separately records the chosen
presentation and both raw and presented quality reports.

## Author's engine decision

After reviewing the comparison above, the author keeps **dagre as the default**.
Both engines now reach non-return reading share 1.0
and draw every non-self return backward on these examples. Dagre has fewer bends
(5/6/4 versus ELK's 10/14/6) and a much smaller complete layout bundle:
56,836 bytes gzip versus 487,848 bytes. ELK eliminates coffee's one crossing,
but that advantage does not outweigh dagre's fewer bends and smaller download.
ELK remains available for layout at build time. Intent adds no crossings for
either engine. The existing default is unchanged.

Local before/after pictures from the adapter change remain in
`/tmp/loop65-r2-i1-pictures/`. No new pictures were made for the summary change
because the resolved maps and quality profiles are identical. Pictures are not
committed or uploaded.
