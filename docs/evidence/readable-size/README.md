# Readable natural map size

Before: `f8e1d76`, the previous size fix updated with main. After: this branch.
Captures use Chromium, 1280 × 1100 and 390 × 1100 viewports, light and dark
host colours, and reduced motion. Both initial-step and whole-map screenshots
are included for coffee, door and Euclid.

The example pages and source JSON are unchanged during capture. Their pinned
CDN JavaScript/CSS requests are redirected to the local output of
`npm run build && npm run demo:build`, so screenshots exercise the reviewed code.
Dark colours use the existing `--cmap-*` custom properties.

The new regression test checks actual on-screen font sizes, centering, viewport
fit and ordinary CSS overrides with `style-src-attr 'none'`. It fails against the
previous implementation in Chromium and Firefox and passes with this fix.
WebKit requires CI here because the local MiniBrowser lacks `libavif.so.16`.
The original rendering oracle is retained; comparison ignores only the exact
new root SVG width attribute, not drawing geometry or text.
