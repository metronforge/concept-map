import { readFileSync } from "node:fs";
import { ResolvedMapSchema, SourceMapSchema } from "../../dist/schema.js";
import { layout } from "../../dist/layout/index.js";
import { dagreEngine } from "../../dist/layout/dagre.js";
import { elkEngine } from "../../dist/layout/elk.js";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));

async function examples(names) {
  const cases = [];
  for (const name of names) {
    const source = SourceMapSchema.parse(read(`examples/${name}/map.json`));
    for (const [engine, adapter] of [
      ["dagre", dagreEngine],
      ["elk", elkEngine],
    ]) {
      cases.push({
        id: `examples/${engine}/${name}`,
        source,
        resolved: await layout(source, adapter),
      });
    }
  }
  return cases;
}

/** Supplemental aligned boxes and the shared pass's stretched routes. */
export const sameRankInputs = () => examples(["same-rank"]);

/** Keep every edge, including the book's frame endpoint in map 2-1. */
export async function inputs() {
  const cases = await examples(["coffee", "door", "gcd"]);
  for (const { id, map } of read("test/fixtures/book-maps.json")) {
    const resolved = ResolvedMapSchema.parse(map);
    cases.push({ id: `book/hand/${id}`, source: resolved, resolved });
  }
  return cases;
}
