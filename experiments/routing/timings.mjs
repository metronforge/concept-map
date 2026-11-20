import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cpus, platform, release, arch } from "node:os";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeChannel } from "./channel.mjs";
import { loadAvoid, routeAvoid } from "./avoid.mjs";
import { hash } from "./metrics.mjs";
import { timeRouter } from "./timing.mjs";

const [directory, extra] = process.argv.slice(2);
assert.ok(
  directory && !extra,
  "Usage: node experiments/routing/timings.mjs <output-directory>",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");

function report(file, data) {
  const path = join(directory, "timing", file);
  const json = JSON.stringify(data, null, 2) + "\n";
  assert.ok(json.trimEnd().split("\n").length <= 200, `${path} is too long`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
}

function totals(reports, candidate) {
  const selected = reports.filter((r) => r.candidate === candidate);
  const medians = selected.map((r) => r.routing.medianMs).sort((a, b) => a - b);
  return {
    maps: selected.length,
    edges: selected.reduce((sum, r) => sum + r.edges, 0),
    sumOfMapMediansMs: medians.reduce((sum, n) => sum + n, 0),
    medianMapMs: medians[Math.floor(medians.length / 2)],
    minMapMedianMs: medians[0],
    maxMapMedianMs: medians.at(-1),
  };
}

const problems = (await inputs()).map(prepare);
const avoid = await loadAvoid();
const candidates = [
  ["channel", routeChannel],
  ["libavoid", (problem) => routeAvoid(avoid, problem)],
];
const reports = [];
// Alternate who runs first; no file writes or concurrent benchmarks in this loop.
for (const [i, problem] of problems.entries())
  for (const [name, route] of i % 2 ? [...candidates].reverse() : candidates)
    reports.push(timeRouter(name, problem, route));
assert.equal(reports.length, 58);
const summary = {
  recordedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    v8: process.versions.v8,
    platform: platform(),
    release: release(),
    arch: arch(),
    cpu: cpus()[0].model,
    logicalCpus: cpus().length,
  },
  lockSha256: hash(readFileSync("package-lock.json")),
  experimentLockSha256: hash(
    readFileSync("experiments/routing/package-lock.json"),
  ),
  method:
    "one warm-up per map/candidate, then five sequential routing calls; alternate candidate order by map",
  channel: totals(reports, "channel"),
  libavoid: totals(reports, "libavoid"),
};
for (const result of reports)
  report(`${result.candidate}/${result.id}.json`, result);
report("summary.json", summary);
console.log(JSON.stringify(summary, null, 2));
