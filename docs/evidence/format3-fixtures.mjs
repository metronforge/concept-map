// Run from the repository root after npm run build. Reads the immutable base;
// never updates fixtures or the golden oracle.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { renderInline, SourceMapSchema } from "../../dist/index.js";

const before = JSON.parse(
  execFileSync("git", ["show", "0b9380e:test/fixtures/book-maps.json"], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  }),
);
const after = JSON.parse(readFileSync("test/fixtures/book-maps.json", "utf8"));
const golden = JSON.parse(
  readFileSync("test/fixtures/render-golden.json", "utf8"),
);
assert.equal(after.length, 23);
const rows = after.map(({ id, map }) => {
  const restored = structuredClone(map);
  restored.format = 2;
  restored.spread = restored.id;
  delete restored.id;
  delete restored.layers;
  let leaves = 0;
  const text = (value) => {
    leaves++;
    return renderInline(value);
  };
  for (const d of Object.values(restored.definitions)) d.text = text(d.text);
  for (const g of restored.concepts)
    for (const c of g.items) c.short = text(c.short);
  for (const d of restored.deeper) d.why = text(d.why);
  for (const s of restored.scenarios) {
    if (s.whole?.text !== undefined) s.whole.text = text(s.whole.text);
    for (const step of s.steps) {
      step.text = text(step.text);
      if (step.fix !== undefined) step.fix = text(step.fix);
    }
  }
  assert.deepEqual(restored, before.find((entry) => entry.id === id).map, id);
  const source = structuredClone(map);
  delete source.viewBox;
  for (const n of Object.values(source.nodes)) delete n.box;
  for (const l of Object.values(source.lanes))
    for (const key of ["x", "y", "w", "h"]) delete l[key];
  for (const f of Object.values(source.frames)) delete f.box;
  for (const e of Object.values(source.edges)) {
    delete e.path;
    delete e.badge;
    if (e.label) e.label = e.label.text;
  }
  for (const s of source.scenarios)
    for (const b of s.repeatBadges ?? []) delete b.at;
  SourceMapSchema.parse(source);
  return {
    id,
    inlineLeaves: leaves,
    goldenStates: golden.filter((g) => g.id === id).length,
    unchangedGeometryAndMeaning: true,
    sourceSchema: "pass",
  };
});
console.log(JSON.stringify(rows, null, 2));
