module.exports = {
  forbidden: [
    {
      name: "layout-only-schema",
      severity: "error",
      from: { path: "^src/layout/" },
      to: { path: "^src/", pathNot: "^src/(layout/|schema([.]ts$|/))" },
    },
    {
      name: "engines-only-adapters",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/layout/(dagre|elk)[.]ts$" },
      to: { path: "node_modules/(@dagrejs/dagre|elkjs)" },
    },
    {
      name: "player-no-layout-runtime",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/layout/" },
      to: { path: "^src/layout/", dependencyTypesNot: ["type-only"] },
    },

    {
      name: "no-external-runtime-outside-schema",
      severity: "error",
      from: {
        path: "^src/",
        pathNot: "^src/schema([.]ts$|/)|^src/layout/(dagre|elk)[.]ts$",
      },
      to: {
        dependencyTypes: [
          "core",
          "npm",
          "npm-dev",
          "npm-optional",
          "npm-peer",
          "npm-bundled",
          "npm-no-pkg",
        ],
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "schema-no-other-module-imports",
      severity: "error",
      from: { path: "^src/schema([.]ts$|/)" },
      to: { path: "^src/", pathNot: "^src/schema([.]ts$|/)" },
    },
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    {
      name: "schema-only-zod",
      severity: "error",
      from: { path: "^src/schema([.]ts$|/)" },
      to: {
        pathNot: "node_modules/zod|^src/schema([.]ts$|/)",
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "model-no-shell-or-render",
      severity: "error",
      from: { path: "^src/model/" },
      to: { path: "^src/(dom|render)/" },
    },
    {
      name: "core-no-shell",
      severity: "error",
      from: { path: "^src/(index[.]ts$|schema|model|render)" },
      to: { path: "^src/(dom/|element)" },
    },
    {
      name: "model-schema-types-only",
      severity: "error",
      from: { path: "^src/model/" },
      to: { path: "^src/schema([.]ts$|/)", dependencyTypesNot: ["type-only"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
