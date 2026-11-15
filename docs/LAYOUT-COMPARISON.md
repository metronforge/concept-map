# Layout comparison

[Open the comparison page](https://metronforge.github.io/concept-map/).
The source of this preview is the `docs/layout-comparison` branch. Its commit and
build date are shown on the page; the author has not selected a default engine.

The page shows all 23 book maps and an English coffee-shop map, each with manual,
dagre and ELK geometry. Each column runs MapPlayer with its own scenario selector, By step and Whole map
modes, token animation and replay. Use the 1:1 button to inspect labels and routes.
The coffee source uses `direction: right` and has Normal and Out of milk flows.
The tables also count edge-label overlaps with nodes and other edge labels. Metrics cover the entire map regardless of the selected state.
The arrow `timeout_outer` in map 2.1 is excluded from all three columns and clearly
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
