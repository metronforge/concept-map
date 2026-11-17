// Size Limit externalizes peer dependencies by default. Measure actual consumer bytes.
const cases = [
  {
    name: "web component (pre-resolved map; with Zod)",
    path: "dist/element.js",
    entry: ["element"],
    gzip: true,
    // +1700 B for browser refinement and its optional measurement schema.
    limit: "42350 B",
  },
  {
    name: "browser player (pre-resolved map)",
    path: "dist/dom/index.js",
    import: {
      "dist/dom/index.js": "{ MapPlayer, connectConcepts }",
    },
    gzip: true,
    // +1400 B for real-font measurement, pure refinement and wrapped replay.
    limit: "9883 B",
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
    // +900 B for shared problem negotiation, boundary errors and lane verdicts.
    // +350 B for the measurement port, provenance and metric validation.
    // +450 B for shared number placement, replacing the legacy badge search.
    limit: "36700 B",
  },
  {
    name: "layout check (quality report with font tables, without Zod)",
    path: "dist/layout/stages/report.js",
    import: {
      "dist/layout/stages/report.js": "{ check }",
    },
    gzip: true,
    // +400 B for the source-based lane verdicts.
    // +350 B for object measurers, validated metrics and uncertainty intervals.
    limit: "6150 B",
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
