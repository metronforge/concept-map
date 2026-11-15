# Measured step-number checks

Before: `a632600`, the previous step-number change updated with main at `cae043a`.
After: this branch. Chromium captures use 1280 × 1100 and 390 × 1100 viewports,
light host colours and reduced motion. Coffee, door and Euclid are captured in
initial-step and whole-map views.

Example pages retain their HTML and source maps. Their pinned CDN JavaScript
and stylesheet imports are redirected to the local output of
`npm run build && npm run demo:build` so the captures exercise the reviewed code.

The browser regression measures rendered text and circle bounds, visits every
step of the door at both viewport widths, and checks a font that finishes
loading after the player mounts. All six Chromium and Firefox cases fail on
main before the change. All 154 Chromium and Firefox tests pass afterwards,
including the unchanged three-example step-number checks. `npm run verify`
passes with 162 unit tests and unchanged render goldens. Local WebKit lacks
`libavif.so.16`; CI supplies its browser evidence.

Browser placement uses actual text bounds transformed into SVG coordinates.
It runs after font readiness and every render, including step and scenario
changes. The server retains its table-based fallback. Intentional attachments
to node corners are preserved when they do not cover text.
