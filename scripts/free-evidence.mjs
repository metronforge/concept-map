import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { SourceMapSchema } from "../dist/schema.js";
import { layout, check } from "../dist/layout/index.js";
import { dagreEngine } from "../dist/layout/dagre.js";
import { elkEngine } from "../dist/layout/elk.js";

const destination = process.argv[2];
if (!destination) throw new Error("Pass an output directory for the reports");
const text = readFileSync("examples/free/map.json", "utf8");
const source = SourceMapSchema.parse(JSON.parse(text));
for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
])
  for (const hinted of [false, true]) {
    const input = structuredClone(source);
    if (!hinted) delete input.layout;
    const start = performance.now();
    const map = await layout(input, engine, { intent: false });
    const elapsedMs = performance.now() - start;
    const report = check(input, map);
    assert.equal(report.hard, 0);
    assert.equal(map.nodes.plan.box[1] < map.nodes.review.box[1], hinted);
    assert.deepEqual(
      report.constraints.map((c) => [c.kind, c.holds]),
      hinted ? [["free", null]] : [],
    );
    save(`server/${name}-${hinted ? "hinted" : "plain"}.json`, {
      engine: name,
      hinted,
      elapsedMs,
      report,
      boxes: Object.fromEntries(
        Object.entries(map.nodes).map(([id, node]) => [id, node.box]),
      ),
      viewBox: map.viewBox,
    });
  }
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
save("server/meta.json", {
  node: process.version,
  revision: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  sourceSha256: createHash("sha256").update(text).digest("hex"),
  lockSha256: createHash("sha256")
    .update(readFileSync("package-lock.json"))
    .digest("hex"),
  dagre: pkg.devDependencies["@dagrejs/dagre"],
  elk: pkg.devDependencies.elkjs,
  intent: false,
});

function save(path, report) {
  mkdirSync(`${destination}/${path.split("/")[0]}`, { recursive: true });
  const json = JSON.stringify(report, null, 2) + "\n";
  assert.ok(json.trimEnd().split("\n").length <= 500);
  writeFileSync(`${destination}/${path}`, json);
}
