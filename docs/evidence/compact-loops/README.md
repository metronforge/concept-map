# Compact self-transition checks

Before: main at `cae043a`. After: this branch. Chromium captures use 1280 × 1100
and 390 × 1100 viewports, light host colours and reduced motion. Coffee, door
and Euclid are captured in initial-step and whole-map views.

Example pages retain their HTML and source maps. Their pinned CDN JavaScript
and stylesheet imports are redirected to the local output of
`npm run build && npm run demo:build` so the captures exercise the reviewed code.

The browser regression measures rendered loop, label, neighboring block and
neighboring-text bounds at native SVG scale. It checks both directions and both
engines, compactness and an eight-unit clearance. The previous implementation
fails in Chromium and Firefox. Unit regressions also exercise blocked sides,
top/bottom candidates and multiple self-transitions. Existing render goldens
and browser tests are unchanged. Local WebKit lacks `libavif.so.16`; CI supplies
its browser evidence.
