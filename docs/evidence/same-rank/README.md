# Align parallel outcomes

The source is `examples/same-rank/map.json`: Start → Quick and
Start → Prepare → Finish. Both engines place Quick at rank coordinate 116
and Finish at 216 without the hint. With the required `sameRank` hint, both
are at 216. Start and Prepare keep their positions. All four server drawings
have zero hard defects. The source has no arrow labels or self-loops; its
step numbers, boxes and lines are checked independently.

The comparison page has two sections: `#map-same-rank` with the hint and
`#map-same-rank-plain` without it. Each section also includes both scenario
intent settings. Removing the hint changes only `layout`, not the story,
labels or edges. In this example intent does not change either drawing.

## Recorded files

- `server/<engine>-<hinted|plain>.json`: one complete font-table report,
  box coordinates and view box per engine and hint setting. Intent is on.
- `server/meta.json`: Node and engine versions, source and lock hashes,
  and the parent revision on which this example was added.
- `browser/<browser>/<engine>-<hinted|plain>-<width>.json`: one DOM-font report
  after `document.fonts.ready`, measurement metadata, outcome coordinates,
  and observations for all four steps and whole-map mode.

The 24 browser reports cover Chromium, Firefox and WebKit, both engines,
both hint settings, and 1280/390 px viewports. All 120 state checks pass:
zero hard defects, no horizontal overflow, matching drawn boxes, arrow paths
and step numbers, and node text between the page size and 1.25 times that size.
The browser check renders the same comparison section and mounts the same
player as the comparison page, with its actual styles and pinned DejaVu fonts.
A sizing rule scoped to these two sections keeps the SVG at its natural
page-relative text size instead of filling the fixed-height preview.
Pictures are kept outside the repository for the author.

## Reproduce

Use Node 26 and the locked dependencies. Write a fresh run outside this folder:

```sh
npm run build
node scripts/same-rank-evidence.mjs /tmp/same-rank-evidence
npm run demo:build
SAME_RANK_EVIDENCE_DIR=/tmp/same-rank-evidence npm run test:browser -- test/browser/same-rank.spec.ts --output=/tmp/same-rank-browser
npm run comparison:build
```

Serve `comparison-dist` over HTTP to inspect the two sections. The browser
test attaches each report even when the environment variable is absent;
it never rewrites recorded evidence unless the destination is explicitly set.
Existing quality-baseline and scenario-intent evidence is unchanged.
