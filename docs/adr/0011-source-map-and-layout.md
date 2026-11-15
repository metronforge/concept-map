# ADR 0011: source map and automatic layout

Status: accepted for 0.2.0; the default engine is decided by measurement

## Context

A resolved map holds pixel boxes for every node and an SVG path for every
edge. Writing those by hand is slow and blocks anyone but the book's author.

## Decision

Two levels of the same format 3:

- **Source map** — meaning only: layers (`id → { label }`), optional lanes,
  nodes (`label`, `layer`, `lane?`), edges (`from`, `to`, `label?`), frames,
  definitions, code, scenarios with steps and flow. No coordinates, no paths.
- **Resolved map** — the source map plus geometry (`viewBox`, boxes, edge
  paths, badge points). The player reads only resolved maps.

`layout(source, engine) → Promise<ResolvedMap>` fills the geometry through
the port

```ts
interface LayoutEngine {
  layout(graph: LayoutGraph): Promise<LayoutResult>;
}
```

`LayoutGraph` and `LayoutResult` are library types (nodes with sizes, lanes
as ordered partitions, edges); an adapter translates them to one engine.
Adapters: `./layout/dagre` (`@dagrejs/dagre`, MIT, ~17 kB gzip) and
`./layout/elk` (`elkjs`, EPL-2.0 or GPL-3.0, ~477 kB gzip, native lanes and
orthogonal routing). Each engine is an optional peer dependency; only its
adapter imports it.

Node sizes come from label measurement: on the server from a font metrics
table shipped with the library, in the browser from the DOM. Layout runs
once and its result can be saved, so pages may ship resolved maps and no
engine.

A resolved map written by hand (the book) stays valid: geometry may be given,
in which case `layout` keeps it.

Text leaves are plain text with the inline markup the library already
renders (`` `code` ``, `*em*`, `**strong**`, backslash escapes), escaped by
the library. HTML is not accepted; links stay in `deeper` and `sources`.
This removes debt D8.

## To decide by measurement

Which engine is the default in examples and in `<concept-map>`. Evidence:
both engines lay out the 23 book maps (geometry stripped to sources) and the
coffee-shop example; screenshots side by side, edge crossings, bends, area,
time and bundle size. The author decides on the screenshots.

## Consequences

- Invariant I10: `layout` is deterministic (same source and engine version,
  same resolved map) and every resolved map it returns passes the schema and
  the reference checks.
- How hosts choose, load and bundle an engine (CDN, bundler, worker,
  build-time layout) is a separate piece of work with its own examples.
