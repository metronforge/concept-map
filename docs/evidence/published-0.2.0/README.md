# Published 0.2.0 examples

Checked on 2026-11-15 in Chromium, with light colours and reduced motion.
The repository was served with `python3 -m http.server 4370 --bind 127.0.0.1`.
The HTML and map JSON came from that local server; all package JavaScript,
CSS and dependencies came from the real esm.sh service. No requests were
intercepted or replaced with local build output.

For each of coffee, door and Euclid:

1. Open `/examples/coffee/`, `/examples/door/` or `/examples/gcd/`.
2. Wait for the custom element, its diagram and fonts to load.
3. Click **Next step** and verify the status announces Step 2.
4. Click **Whole map** and verify the selected view.
5. Capture the full page at viewport widths 1280 and 390 px (height 1000 px).

All three passed. The module and CSS use
`https://esm.sh/@metronforge/concept-map@0.2.0/element` and
`https://esm.sh/@metronforge/concept-map@0.2.0/css`. The CSS entry resolves to
`/css/concept-map.css`; the element loads its dagre adapter and engine from the
CDN when resolving the source map. `network.json` records responses, selected
assets and final player state. There were no failed requests or page errors.

The server-rendering snippet in the root README was also run against the three
example JSON files after `npm run build`. Each call returned figure markup with
an SVG and embedded map data: coffee has three nodes; door and Euclid have five.
`dagreEngine` was verified to be an object.

These are captures of the published package, including its existing narrow-screen
layout limitations. This documentation change does not modify the renderer.
