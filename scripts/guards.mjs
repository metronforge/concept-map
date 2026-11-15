import sizeCases from "../.size-limit.js";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
assert.deepEqual(pkg.dependencies ?? {}, {});
assert.deepEqual(pkg.peerDependencies, {
  zod: "^4",
  "@dagrejs/dagre": "^3.1.3",
  elkjs: "^0.12.1",
});
assert.deepEqual(Object.keys(pkg.exports), [
  ".",
  "./css",
  "./resolved-map.schema.json",
  "./source-map.schema.json",
  "./layout",
  "./layout/dagre",
  "./layout/elk",
  "./layout/browser",
  "./dom",
  "./element",
]);
const ts = JSON.parse(readFileSync("tsconfig.json", "utf8")).compilerOptions;
if (ts.sourceMap || ts.declarationMap)
  assert.ok(
    pkg.files.includes("src/"),
    "Source maps point into src/: publish src/ or turn the maps off",
  );
const css = readFileSync("css/concept-map.css", "utf8"),
  doc = readFileSync("docs/CSS.md", "utf8");
const props = [
  ...new Set([...css.matchAll(/--cmap-[\w-]+/g)].map((m) => m[0])),
].sort();
const documented = [
  ...new Set([...doc.matchAll(/`(--cmap-[\w-]+)`/g)].map((m) => m[1])),
].sort();
assert.deepEqual(
  props,
  documented,
  "CSS contract must list exactly the exposed custom properties",
);
console.log("Runtime dependencies, format-3 exports and CSS contract passed");

assert.deepEqual(pkg.peerDependenciesMeta, {
  "@dagrejs/dagre": { optional: true },
  elkjs: { optional: true },
});

assert.deepEqual(pkg.sideEffects, ["./css/*.css", "./dist/element.js"]);
for (const check of sizeCases) {
  assert.ok(check.limit, "Every consumer scenario needs a size limit");
  assert.deepEqual(
    check.modifyRolldownConfig({ external: ["zod"] }).external,
    [],
    "Measure peers, including Zod, rather than externalizing them",
  );
}
