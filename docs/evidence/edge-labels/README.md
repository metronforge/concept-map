# Arrow label checks

The screenshots compare the base implementation with this fix using Chromium
at 1440 × 1100 for the three examples and 1800 × 1200 for the comparison.
Both light and dark host colours are included. Reduced motion keeps playback
stable while capturing the whole-map view.

Example HTML is served with its pinned CDN JavaScript and CSS URLs replaced by
the local build (`npm run build && npm run demo:build`). Source maps and page
styles are otherwise unchanged. Dark colours are supplied through the existing
`--cmap-*` properties.

Run `npm run comparison:build` to regenerate the comparison page. The
`before/comparison` and `after/comparison` folders contain all 24 map sections,
including all three layout columns. Those captures force ghost labels and edges
to full opacity so every label can be inspected, including labels outside the
initial scenario. The smaller coffee comparison captures retain normal step
visibility.

Geometry tests cover both directions, with and without lanes, and the reserved
space for self-transition labels. Browser tests check background colour,
paint order and stroke width in both themes. The halo applies to all labels,
including hand layouts and ELK, while side placement is specific to Dagre.
