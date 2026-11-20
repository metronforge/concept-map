import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { loadAvoid, routeAvoid } from "./avoid.mjs";
import { routeIssues } from "./route-audit.mjs";
import { hash, routeLength } from "./metrics.mjs";
import { bends } from "../../scripts/comparison/metrics.mjs";

const [directory, mode] = process.argv.slice(2);
assert.ok(
  directory && (!mode || mode === "--check"),
  "Usage: node experiments/routing/avoids.mjs <output-directory> [--check]",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");

function report(file, data) {
  const path = join(directory, "libavoid-geometry", file);
  if (mode === "--check") {
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), data, path);
    return;
  }
  const json = JSON.stringify(data, null, 2) + "\n";
  assert.ok(json.trimEnd().split("\n").length <= 200, `${path} is too long`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
}

function audit(avoid, item) {
  const problem = prepare(item),
    routes = routeAvoid(avoid, problem);
  const failures = routes.flatMap((route, i) => {
    const issues = routeIssues(problem, problem.edges[i], route);
    if (route.failure) issues.unshift(route.failure);
    return issues.length ? [{ id: route.id, issues }] : [];
  });
  const rejected = new Set(failures.map((f) => f.id));
  const paths = routes
    .filter((r) => !rejected.has(r.id))
    .map(({ points }) => `M${points.map((p) => p.join(" ")).join(" L")}`);
  return {
    id: item.id,
    stage: "libavoid geometry only",
    inputSha256: hash(JSON.stringify(problem)),
    routesSha256: hash(JSON.stringify(routes)),
    edges: routes.length,
    routed: paths.length,
    failures,
    bends: bends(paths),
    routeLength: routeLength(paths),
  };
}

const avoid = await loadAvoid();
const reports = (await inputs()).map((item) => audit(avoid, item));
assert.equal(reports.length, 29);
for (const result of reports) report(`${result.id}.json`, result);
const sum = (key) => reports.reduce((n, result) => n + result[key], 0);
const summary = {
  node: process.version,
  lockSha256: hash(readFileSync("package-lock.json")),
  experimentLockSha256: hash(
    readFileSync("experiments/routing/package-lock.json"),
  ),
  stage: "libavoid geometry only",
  maps: reports.length,
  ...Object.fromEntries(
    ["edges", "routed", "bends", "routeLength"].map((key) => [key, sum(key)]),
  ),
  failed: reports.reduce((n, result) => n + result.failures.length, 0),
};
report("summary.json", summary);
console.log(JSON.stringify(summary, null, 2));
