// Size Limit externalizes peer dependencies by default. Measure actual consumer bytes.
const cases = [
  {
    name: "web component (pre-resolved map; with Zod)",
    path: "dist/element.js",
    entry: ["element"],
    gzip: true,
    // Same-rank hint validation and checking: measured 47827 B + 100 B margin.
    limit: "47927 B",
  },
  {
    name: "browser player (pre-resolved map)",
    path: "dist/dom/index.js",
    import: {
      "dist/dom/index.js": "{ MapPlayer, connectConcepts }",
    },
    gzip: true,
    // Author-approved increase: 14157 B -> 15725 B (+1568 B).
    // Wide/narrow checks, 1 em hysteresis, in-place geometry updates,
    // running token animations and a narrow-layout cache are needed together.
    // Same-rank hint checking: measured 16176 B + 100 B margin.
    limit: "16276 B",
  },
  {
    name: "server render (pre-resolved map)",
    path: "dist/index.js",
    import: {
      "dist/index.js":
        "{ renderSvg, renderPanelParts, renderConcepts, derive, initialState }",
    },
    gzip: true,
    // Shared SVG positions: measured 4385 B + 100 B (2.3%) margin.
    limit: "4485 B",
  },
  {
    name: "source and resolved validation (with Zod)",
    path: "dist/index.js",
    import: {
      "dist/index.js": "{ SourceMapSchema, ResolvedMapSchema }",
    },
    gzip: true,
    // Size audit before 0.3.0: measured 27049 B + margin (AGENTS.md "Size limits").
    limit: "27860 B",
  },
  {
    name: "layout port (with Zod; engine supplied by host)",
    path: "dist/layout/index.js",
    import: {
      "dist/layout/index.js": "{ layout, measureLabel }",
    },
    gzip: true,
    // Same-rank hints and named refusals: measured 39196 B + 100 B margin.
    limit: "39296 B",
  },
  {
    name: "layout check (quality report with font tables, without Zod)",
    path: "dist/layout/stages/report.js",
    import: {
      "dist/layout/stages/report.js": "{ check }",
    },
    gzip: true,
    // Independent same-rank verdicts: measured 5320 B + 100 B margin.
    limit: "5420 B",
  },
  {
    name: "complete root API (with Zod)",
    path: "dist/index.js",
    gzip: true,
    // Size audit before 0.3.0: measured 32743 B + margin (AGENTS.md "Size limits").
    limit: "33725 B",
  },
];
export default cases.map((check) => ({
  ...check,
  modifyRolldownConfig: (config) => ({ ...config, external: [] }),
}));
