import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { inputs } from "./inputs.mjs";
import { hash, measure, totals } from "./metrics.mjs";

const [directory, mode] = process.argv.slice(2);
assert.ok(
  directory && (!mode || mode === "--check"),
  "Usage: node experiments/routing/baseline.mjs <output-directory> [--check]",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");

function report(file, data) {
  const path = join(directory, file);
  if (mode === "--check") {
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), data, path);
    return;
  }
  const json = JSON.stringify(data, null, 2) + "\n";
  assert.ok(json.trimEnd().split("\n").length <= 200, `${path} is too long`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
}

const reports = (await inputs()).map(measure);
assert.equal(reports.length, 29);
for (const result of reports) report(`current/${result.id}.json`, result);
const summary = {
  node: process.version,
  lockSha256: hash(readFileSync("package-lock.json")),
  all: totals(reports),
  examples: totals(reports.filter((r) => r.id.startsWith("examples/"))),
  book: totals(reports.filter((r) => r.id.startsWith("book/"))),
};
report("current/summary.json", summary);
console.log(JSON.stringify(summary, null, 2));
