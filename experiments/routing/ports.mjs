import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { inputs } from "./inputs.mjs";
import { hash } from "./metrics.mjs";
import { prepare } from "./prepare.mjs";

const [directory, mode] = process.argv.slice(2);
assert.ok(
  directory && (!mode || mode === "--check"),
  "Usage: node experiments/routing/ports.mjs <output-directory> [--check]",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");

function report(file, data) {
  const path = join(directory, "ports", file);
  if (mode === "--check") {
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), data, path);
    return;
  }
  const json = JSON.stringify(data, null, 2) + "\n";
  assert.ok(json.trimEnd().split("\n").length <= 200, `${path} is too long`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
}

function audit(item) {
  const problem = prepare(item);
  const terminals = problem.edges.flatMap((edge) => [edge.from, edge.to]);
  return {
    id: item.id,
    inputSha256: hash(JSON.stringify(problem)),
    nodes: problem.nodes.length,
    frames: problem.frames.length,
    edges: problem.edges.length,
    terminals: terminals.length,
    frameTerminals: terminals.filter((t) => t.kind === "frame").length,
    gappedTerminals: terminals.filter((t) => t.gap > 0).length,
    maximumGap: Math.max(0, ...terminals.map((t) => t.gap)),
    cornerTerminals: terminals.filter((t) => t.sides.length > 1).length,
    selfLoops: problem.edges.filter((e) => e.from.id === e.to.id).length,
  };
}

const reports = (await inputs()).map(audit);
for (const result of reports) report(`${result.id}.json`, result);
const sum = (key) => reports.reduce((n, result) => n + result[key], 0);
const summary = {
  node: process.version,
  lockSha256: hash(readFileSync("package-lock.json")),
  maps: reports.length,
  ...Object.fromEntries(
    [
      "nodes",
      "frames",
      "edges",
      "terminals",
      "frameTerminals",
      "gappedTerminals",
      "cornerTerminals",
      "selfLoops",
    ].map((key) => [key, sum(key)]),
  ),
  maximumGap: Math.max(...reports.map((r) => r.maximumGap)),
};
report("summary.json", summary);
console.log(JSON.stringify(summary, null, 2));
