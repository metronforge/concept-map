# Layout comparison

[Open the comparison page](https://metronforge.github.io/concept-map/).
The page is rebuilt and published from `main` after every merge. Its commit and
build date are shown on the page. Dagre remains the default engine; the author
will reconsider it after reviewing scenario intent.

The page shows the coffee, door and gcd examples, all 23 book maps and the original
coffee reference. Each engine has two drawings: with the default scenario intent
and without it (`layout(source, engine, { intent: false })`). Hand references
appear once, unchanged, where available; intent cannot alter hand geometry.
Each column runs MapPlayer with its own scenario selector, By step and Whole map
modes, token animation and replay. Use the 1:1 button to inspect labels and routes.
The current examples use the exact sources in `examples/`. The historical coffee
reference has a different source and is labelled separately.
The tables show the library's quality report (`check` from `@metronforge/concept-map/layout`): hard defects, crossings and the share of the first scenario's arrows that follow the reading direction, plus bends and area. Metrics cover the entire map regardless of the selected state. Every drawing also has an expandable server report, measured with font tables. Browser players refine labels and may move them into the panel, so these saved reports do not replace checks with the rendered fonts.
The arrow `timeout_outer` in map 2.1 is excluded from every variant and clearly
marked; original fixtures are unchanged.

Reproduce with the locked dependencies:

```sh
npm ci
npm run comparison:build
python3 -m http.server 4325 --directory comparison-dist
```

Open http://localhost:4325/. `comparison-dist/metrics.json` contains exact metrics,
all timing samples, engine versions and provenance. Source and resolved JSON and
standalone SVGs are under `data/` and `svg/`. The generator fails on reference,
schema, path-format or determinism errors rather than publishing partial results.

See [ADR 0017](adr/0017-layout-comparison-method.md) for metric definitions and
limitations. The `Layout comparison` workflow builds pull requests as downloadable
artifacts and publishes only the dedicated comparison branch through GitHub Pages.
This is review evidence, not an engine recommendation or the integration example.
