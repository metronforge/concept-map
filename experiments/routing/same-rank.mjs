import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cpus, platform, arch } from "node:os";
import { format } from "prettier";
import { sameRankInputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeChannel } from "./channel.mjs";
import { routeIssues } from "./route-audit.mjs";
import { assemble, outsideViewport } from "./assemble.mjs";
import { hash, measure, totals } from "./metrics.mjs";
import { overlapAudit } from "./overlap.mjs";
import { timeRouter, sampleStats } from "./timing.mjs";

const [directory, mode] = process.argv.slice(2);
assert.ok(
  directory && (!mode || mode === "--check"),
  "Usage: node experiments/routing/same-rank.mjs <output-directory> [--check]",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");

async function report(file, data) {
  const path = join(directory, "same-rank", file);
  const stored = JSON.parse(JSON.stringify(data));
  if (mode === "--check") {
    assert.deepEqual(JSON.parse(readFileSync(path)), stored, path);
    return;
  }
  const json = await format(JSON.stringify(stored), { parser: "json" });
  assert.ok(json.trimEnd().split("\n").length <= 200, `${path}: too long`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
}

async function timing(problem, routes) {
  const file = `timing/${problem.id}.json`;
  if (mode !== "--check") {
    await report(file, timeRouter("channel", problem, routeChannel));
    return;
  }
  const data = JSON.parse(readFileSync(join(directory, "same-rank", file)));
  assert.deepEqual(data, {
    id: problem.id,
    candidate: "channel",
    inputSha256: hash(JSON.stringify(problem)),
    routesSha256: hash(JSON.stringify(routes)),
    edges: problem.edges.length,
    routing: sampleStats(data.routing.samplesMs),
  });
}

function reroute(item) {
  const problem = prepare(item),
    routes = routeChannel(problem);
  assert.equal(routes.length, problem.edges.length);
  routes.forEach((route, i) => {
    assert.equal(route.id, problem.edges[i].id);
    assert.deepEqual(routeIssues(problem, problem.edges[i], route), []);
  });
  const resolved = assemble(item, routes);
  for (const key of ["nodes", "viewBox", "frames", "lanes", "scenarios"])
    assert.deepEqual(resolved[key], item.resolved[key]);
  return { problem, routes, item: { ...item, resolved } };
}

async function record(item, candidate) {
  const quality = { ...measure(item), candidate };
  const overlap = overlapAudit(
    Object.entries(item.resolved.edges).map(([id, edge]) => ({
      id,
      path: edge.path,
    })),
  );
  const outside = outsideViewport(item.resolved);
  await report(`${candidate}/${item.id}.json`, quality);
  await report(`overlap/${candidate}/${item.id}.json`, overlap);
  return {
    ...quality,
    outsideViewport: outside,
    sharedLength: overlap.sharedLength,
  };
}

const cases = await sameRankInputs();
assert.equal(cases.length, 2);
const reports = { current: [], channel: [] };
for (const item of cases) {
  const routed = reroute(item);
  reports.current.push(await record(item, "current"));
  reports.channel.push(await record(routed.item, "channel"));
  await timing(routed.problem, routed.routes);
}
const summary = {
  node: process.version,
  lockSha256: hash(readFileSync("package-lock.json")),
  sourceSha256: hash(readFileSync("examples/same-rank/map.json")),
  reference:
    "shared same-rank alignment with stretched routes; default derived intent",
  candidates: Object.fromEntries(
    Object.entries(reports).map(([candidate, rows]) => [
      candidate,
      {
        ...totals(rows),
        sharedLength: rows.reduce((n, row) => n + row.sharedLength, 0),
        outsideViewport: rows.map((row) => ({
          id: row.id,
          edges: row.outsideViewport,
        })),
      },
    ]),
  ),
};
await report("summary.json", summary);
if (mode !== "--check")
  await report("timing/environment.json", {
    recordedAt: new Date().toISOString(),
    node: process.version,
    v8: process.versions.v8,
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0].model,
    method:
      "one warm-up, five sequential channel routing calls per aligned map; preparation, annotations and audits excluded",
  });
console.log(JSON.stringify(summary, null, 2));
