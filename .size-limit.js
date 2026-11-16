// Size Limit externalizes peer dependencies by default. Measure actual consumer bytes.
const cases = [
  {
    name: "web component (pre-resolved map; with Zod)",
    path: "dist/element.js",
    entry: ["element"],
    gzip: true,
    limit: "40650 B",
  },
  {
    name: "browser player (pre-resolved map)",
    path: "dist/dom/index.js",
    import: {
      "dist/dom/index.js": "{ MapPlayer, connectConcepts }",
    },
    gzip: true,
    limit: "8483 B",
  },
  {
    name: "server render (pre-resolved map)",
    path: "dist/index.js",
    import: {
      "dist/index.js":
        "{ renderSvg, renderPanelParts, renderConcepts, derive, initialState }",
    },
    gzip: true,
    limit: "4188 B",
  },
  {
    name: "source and resolved validation (with Zod)",
    path: "dist/index.js",
    import: {
      "dist/index.js": "{ SourceMapSchema, ResolvedMapSchema }",
    },
    gzip: true,
    limit: "29638 B",
  },
  {
    name: "layout port (with Zod; engine supplied by host)",
    path: "dist/layout/index.js",
    import: {
      "dist/layout/index.js": "{ layout, measureLabel }",
    },
    gzip: true,
    // +2.4 kB for the quality check. It is loaded with a dynamic import only
    // for { strict: true }; size-limit counts that chunk too.
    limit: "35000 B",
  },
  {
    name: "layout check (quality report with font tables, without Zod)",
    path: "dist/layout/stages/report.js",
    import: {
      "dist/layout/stages/report.js": "{ check }",
    },
    gzip: true,
    limit: "5400 B",
  },
  {
    name: "complete root API (with Zod)",
    path: "dist/index.js",
    gzip: true,
    limit: "39159 B",
  },
];
export default cases.map((check) => ({
  ...check,
  modifyRolldownConfig: (config) => ({ ...config, external: [] }),
}));
