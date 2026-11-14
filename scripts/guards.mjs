import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
assert.deepEqual(pkg.dependencies ?? {}, {});
assert.deepEqual(pkg.peerDependencies, { zod: "^4" });
assert.deepEqual(Object.keys(pkg.exports), [
  ".",
  "./css",
  "./resolved-map.schema.json",
]);
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
console.log("Runtime dependencies, stage-A exports and CSS contract passed");
