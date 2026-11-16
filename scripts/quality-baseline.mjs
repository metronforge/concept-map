// Records the quality report of the hand-drawn book maps and of the examples
// laid out by each engine. Run after `npm run build`:
//   node scripts/quality-baseline.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ResolvedMapSchema, SourceMapSchema } from "../dist/schema.js";
import { check, layout } from "../dist/layout/index.js";
import { dagreEngine } from "../dist/layout/dagre.js";
import { elkEngine } from "../dist/layout/elk.js";

const dir = "docs/evidence/quality-baseline";
mkdirSync(dir, { recursive: true });
const write = (file, data) =>
  writeFileSync(`${dir}/${file}`, JSON.stringify(data, null, 2) + "\n");

const book = {};
for (const { id, map } of JSON.parse(
  readFileSync("test/fixtures/book-maps.json", "utf8"),
)) {
  const resolved = ResolvedMapSchema.parse(map);
  book[id] = check(resolved, resolved);
}
write("book.json", book);

const examples = {};
for (const name of ["coffee", "door", "gcd"]) {
  const source = SourceMapSchema.parse(
    JSON.parse(readFileSync(`examples/${name}/map.json`, "utf8")),
  );
  for (const [engine, adapter] of [
    ["dagre", dagreEngine],
    ["elk", elkEngine],
  ])
    examples[`${name} ${engine}`] = check(
      source,
      await layout(source, adapter),
    );
}
write("examples.json", examples);

const defects = (r) =>
  [
    r.labels.labels,
    r.labels.lines,
    r.labels.boxes,
    r.steps.labels,
    r.steps.boxes,
    r.steps.steps,
    r.lines.boxes,
  ].map((list) => list.filter((c) => c.band === "defect").length);
const rows = Object.entries({ ...examples, ...book }).map(([id, r]) =>
  [
    id in book ? `book ${id}` : id,
    r.hard,
    ...defects(r),
    r.crossings.count,
    r.reading.share ?? "–",
  ].join(" | "),
);
console.log(rows.join("\n"));
