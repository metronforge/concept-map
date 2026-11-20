import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inputs } from "./inputs.mjs";
import { measure, routeLength } from "./metrics.mjs";

test("route length excludes moveto gaps and includes diagonal segments", () => {
  assert.equal(routeLength(["M0 0 L3 4 M100 100 H110 V120"]), 35);
  assert.equal(routeLength(["M0 0 H10 H0", "M0 0 H0"]), 20);
  assert.equal(routeLength([]), 0);
});

test("all routes survive and reports agree with the untouched quality baseline", async () => {
  const read = (path) => JSON.parse(readFileSync(path, "utf8"));
  const book = read("docs/evidence/quality-baseline/book.json");
  const examples = read("docs/evidence/quality-baseline/examples.json");
  const cases = await inputs();
  assert.equal(cases.length, 29);
  assert.equal(new Set(cases.map((c) => c.id)).size, 29);
  assert.equal(
    cases.reduce((n, c) => n + Object.keys(c.resolved.edges).length, 0),
    260,
  );
  for (const item of cases) {
    const [kind, engine, name] = item.id.split("/");
    const before = JSON.stringify(item);
    assert.deepEqual(
      measure(item).quality,
      kind === "book" ? book[name] : examples[`${name} ${engine}`],
    );
    assert.equal(JSON.stringify(item), before);
  }
  const frameMap = cases.find((c) => c.id === "book/hand/2-1").resolved;
  assert.equal(frameMap.edges.timeout_outer.to, "outer");
  assert.ok(frameMap.frames.outer.box);
});
