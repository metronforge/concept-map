// Size Limit externalizes peer dependencies by default. Measure actual consumer bytes.
// Second audit: margin = min(1000 B, 3% of measured gzip), rounded down.
const cases = [
  {
    name: "web component (pre-resolved map; with Zod)",
    path: "dist/element.js",
    entry: ["element"],
    gzip: true,
    // Measured 48157 B + 1000 B margin.
    limit: "49157 B",
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
    // Measured 27165 B + 814 B margin.
    limit: "27979 B",
  },
  {
    name: "layout port (with Zod; engine supplied by host)",
    path: "dist/layout/index.js",
    import: {
      "dist/layout/index.js": "{ layout, measureLabel }",
    },
    gzip: true,
    // Measured 39762 B + 1000 B margin.
    limit: "40762 B",
  },
  {
    name: "same-rank alignment (on-demand entry)",
    path: "dist/layout/same-rank.js",
    gzip: true,
    // Measured 4990 B + 149 B margin; shared routing helpers are imported.
    limit: "5139 B",
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
    // Measured 33032 B + 990 B margin.
    limit: "34022 B",
  },
];
export default cases.map((check) => ({
  ...check,
  modifyRolldownConfig: (config) => ({ ...config, external: [] }),
}));
