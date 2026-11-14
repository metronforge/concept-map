module.exports = {
  forbidden: [
    {
      name: "no-external-runtime-outside-schema",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/schema[.]ts$" },
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
      name: "schema-no-local-imports",
      severity: "error",
      from: { path: "^src/schema[.]ts$" },
      to: { path: "^src/" },
    },
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    {
      name: "schema-only-zod",
      severity: "error",
      from: { path: "^src/schema[.]ts$" },
      to: { pathNot: "node_modules/zod", dependencyTypesNot: ["type-only"] },
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
      from: { path: "^src/(schema|model|render)" },
      to: { path: "^src/dom/" },
    },
    {
      name: "model-schema-types-only",
      severity: "error",
      from: { path: "^src/model/" },
      to: { path: "^src/schema[.]ts$", dependencyTypesNot: ["type-only"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
