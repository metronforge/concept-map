import { readFileSync, writeFileSync } from "node:fs";
import { ResolvedMapSchema } from "../../../dist/schema.js";
import {
  refine,
  check,
  fontTableMeasurer,
  layout,
} from "../../../dist/layout/index.js";
import { checkLabels } from "../../../dist/layout/stages/label-check.js";
import { dagreEngine } from "../../../dist/layout/dagre.js";
import { elkEngine } from "../../../dist/layout/elk.js";
const annotations = (map) =>
  Object.fromEntries([
    ...Object.entries(map.edges).flatMap(([id, e]) => [
      ...(e.label ? [[`label:${id}`, e.label.at]] : []),
      ...(e.badge ? [[`step:${id}`, e.badge]] : []),
    ]),
    ...map.scenarios.flatMap((s, i) =>
      (s.repeatBadges ?? []).map((b) => [`repeat:${i}:${b.step}`, b.at]),
    ),
  ]);
const results = [];
for (const { id, map: raw } of JSON.parse(
  readFileSync("test/fixtures/book-maps.json", "utf8"),
)) {
  const map = ResolvedMapSchema.parse(raw),
    next = refine(map, fontTableMeasurer);
  const contacts = Object.values(checkLabels(map, map)).flatMap((group) =>
    Object.values(group).flat(),
  );
  const old = annotations(map),
    moved = Object.entries(annotations(next))
      .filter(([key, p]) => JSON.stringify(p) !== JSON.stringify(old[key]))
      .map(([key, p]) => ({
        id: key,
        before: old[key],
        after: p,
        contacts: contacts.filter((c) => c.a === key || c.b === key),
      }));
  results.push({ id, moved, hard: check(map, next).hard });
}
const examples = [];
for (const name of ["coffee", "door", "gcd"])
  for (const engine of [dagreEngine, elkEngine]) {
    const source = JSON.parse(
      readFileSync(`examples/${name}/map.json`, "utf8"),
    );
    examples.push({
      name,
      engine: engine.name,
      map: refine(await layout(source, engine), fontTableMeasurer),
    });
  }
const summary = {
  maps: results.length,
  moved: results.flatMap((r) => r.moved).length,
  clearMoved: results.flatMap((r) => r.moved).filter((m) => !m.contacts.length)
    .length,
  hard: results.reduce((sum, r) => sum + r.hard, 0),
};
writeFileSync(
  process.argv[2],
  JSON.stringify({ summary, results, examples }, null, 2),
);
console.log(summary);
