# Route feedback without changing ranks

The source is `examples/free/map.json`. Without derived scenario intent or the
stated `free` hint, both engines put Plan below Review (rank 216 versus 116).
With the required hint, both put Plan above Review (rank 16 versus 116) and
route the feedback arrow after placement. The four font-table drawings have
zero hard defects. The checker reports `holds: null` for the hint because a
drawing cannot prove which edges influenced ranking.

## Recorded files

- `server/<engine>-<hinted|plain>.json`: one font-table quality report,
  coordinates, view box, and one elapsed layout time per engine and setting.
- `server/meta.json`: Node and engine versions, source and lock hashes, and
  the parent revision for this example.
- `browser/<browser>/<engine>-<hinted|plain>-<width>.json`: one DOM-font report,
  coordinates, and observations for every step and whole-map mode.

The 24 browser reports cover Chromium, Firefox, and WebKit, both engines,
both hint settings, and 1280/390 px viewports. All 120 state checks pass:
zero hard defects, no horizontal overflow, and map text between the page
size and 1.25 times that size. Timing values are single runs, including cold
engine startup, so they show the cost in this run rather than a stable speed
comparison. Pictures are kept outside the repository for the author.

## Reproduce

Use Node 26 and the locked dependencies. Write a fresh run outside this
folder:

```sh
npm run build
node scripts/free-evidence.mjs /tmp/free-evidence
npm run demo:build
FREE_EVIDENCE_DIR=/tmp/free-evidence npm run test:browser -- test/browser/free.spec.ts --output=/tmp/free-browser
```

The browser test attaches each report even when the environment variable is
absent. It does not rewrite recorded evidence unless a destination is set.
Quality-baseline and scenario-intent evidence is unchanged.
