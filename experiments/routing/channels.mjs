import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeChannel } from "./channel.mjs";
import { hash, routeLength } from "./metrics.mjs";
import { bends } from "../../scripts/comparison/metrics.mjs";

const [directory, mode] = process.argv.slice(2);
assert.ok(
  directory && (!mode || mode === "--check"),
  "Usage: node experiments/routing/channels.mjs <output-directory> [--check]",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");

function report(file, data) {
  const path = join(directory, "channel-geometry", file);
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
  const problem = prepare(item),
    routes = routeChannel(problem);
  const successful = routes.filter((r) => r.points);
  const paths = successful.map(
    ({ points }) => `M${points.map((p) => p.join(" ")).join(" L")}`,
  );
  return {
    id: item.id,
    stage: "channel geometry only",
    inputSha256: hash(JSON.stringify(problem)),
    routesSha256: hash(JSON.stringify(routes)),
    edges: routes.length,
    routed: successful.length,
    failures: routes.filter((r) => r.failure),
    bends: bends(paths),
    routeLength: routeLength(paths),
  };
}

const reports = (await inputs()).map(audit);
for (const result of reports) report(`${result.id}.json`, result);
const sum = (key) => reports.reduce((n, result) => n + result[key], 0);
const summary = {
  node: process.version,
  lockSha256: hash(readFileSync("package-lock.json")),
  stage: "channel geometry only",
  maps: reports.length,
  ...Object.fromEntries(
    ["edges", "routed", "bends", "routeLength"].map((key) => [key, sum(key)]),
  ),
  failed: reports.reduce((n, result) => n + result.failures.length, 0),
};
report("summary.json", summary);
console.log(JSON.stringify(summary, null, 2));
