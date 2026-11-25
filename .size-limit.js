// Size Limit externalizes peer dependencies by default. Measure actual consumer bytes.
// Second audit: margin = min(1000 B, 3% of measured gzip), rounded down.
const cases = [
  {
    name: "web component (pre-resolved map; with Zod)",
    path: "dist/element.js",
    entry: ["element"],
    gzip: true,
    // Measured 32108 B + 963 B margin.
    limit: "33071 B",
  },
  {
    name: "browser player (pre-resolved map)",
    path: "dist/dom/index.js",
    import: {
      "dist/dom/index.js": "{ MapPlayer, connectConcepts }",
    },
    gzip: true,
    // Measured 16417 B + 492 B margin.
    limit: "16909 B",
  },
  {
    name: "server render (pre-resolved map)",
    path: "dist/index.js",
    import: {
      "dist/index.js":
        "{ renderSvg, renderPanelParts, renderConcepts, derive, initialState }",
    },
    gzip: true,
    // Measured 4385 B + 131 B margin.
    limit: "4516 B",
  },
  {
    name: "source and resolved validation (with Zod)",
    path: "dist/index.js",
    import: {
      "dist/index.js": "{ SourceMapSchema, ResolvedMapSchema }",
    },
    gzip: true,
    // Measured 11053 B + 331 B margin.
    limit: "11384 B",
  },
  {
    name: "layout port (with Zod; engine supplied by host)",
    entry: ["index"],
    path: "dist/layout/index.js",
    import: {
      "dist/layout/index.js": "{ layout, measureLabel }",
    },
    gzip: true,
    // Static entry: measured 24088 B + 722 B; deferred alignment is below.
    limit: "24810 B",
  },
  {
    name: "same-rank alignment (standalone on-demand entry; includes shared Zod)",
    path: "dist/layout/place-same-rank.js",
    gzip: true,
    // Complete lazy stage: 23328 B + 699 B, replacing the solver-only budget.
    // Author approved a separate budget; shared geometry and Zod are imported.
    limit: "24027 B",
  },
  {
    name: "channel routing (standalone on-demand entry)",
    path: "dist/layout/route/channel-layout.js",
    gzip: true,
    // Measured 4394 B + 131 B margin.
    limit: "4525 B",
  },
  {
    name: "layout check (quality report with font tables, without Zod)",
    path: "dist/layout/stages/report.js",
    import: {
      "dist/layout/stages/report.js": "{ check }",
    },
    gzip: true,
    // Measured 5554 B + 166 B margin.
    limit: "5720 B",
  },
  {
    name: "complete root API (with Zod)",
    path: "dist/index.js",
    gzip: true,
    // Measured 16908 B + 507 B margin.
    limit: "17415 B",
  },
];
export default cases.map((check) => ({
  ...check,
  modifyRolldownConfig: (config) => ({ ...config, external: [] }),
}));
