import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { format } from "prettier";
import { inputs, sameRankInputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeIndependent as routeChannel } from "./channel-independent.mjs";
import { orderChannels } from "./channel-order.mjs";
import { routeIssues } from "./route-audit.mjs";
import { hash } from "./metrics.mjs";

const [directory, mode] = process.argv.slice(2);
assert.ok(
  directory && (!mode || mode === "--check"),
  "Usage: node experiments/routing/orders.mjs <output-directory> [--check]",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");

async function report(file, data) {
  const path = join(directory, "track-order", file);
  const json = await format(JSON.stringify(data), { parser: "json" });
  assert.ok(json.trimEnd().split("\n").length <= 200, `${path}: too long`);
  if (mode === "--check") {
    assert.deepEqual(JSON.parse(readFileSync(path)), JSON.parse(json), path);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
}

function counts(groups) {
  return {
    groups: groups.length,
    ordered: groups.filter((g) => g.order !== null).length,
    unique: groups.filter((g) => g.unique).length,
    conflicting: groups.filter((g) => g.cycle.length).length,
    segments: groups.reduce((n, g) => n + g.segments.length, 0),
    constraints: groups.reduce((n, g) => n + g.constraints.length, 0),
  };
}

async function record(item) {
  const problem = prepare(item),
    routes = routeChannel(problem);
  routes.forEach((route, i) =>
    assert.deepEqual(routeIssues(problem, problem.edges[i], route), []),
  );
  const before = structuredClone(routes),
    groups = orderChannels(routes);
  assert.deepEqual(routes, before);
  const row = {
    id: item.id,
    inputSha256: hash(JSON.stringify(problem)),
    routesSha256: hash(JSON.stringify(routes)),
    edges: routes.length,
    ...counts(groups),
  };
  await report(`${item.id}/summary.json`, row);
  for (const [index, group] of groups.entries())
    await report(`${item.id}/group-${index}.json`, group);
  return row;
}

for (const [corpus, cases] of [
  ["original", await inputs()],
  ["aligned", await sameRankInputs()],
]) {
  const rows = [];
  for (const item of cases) rows.push(await record(item));
  const summary = {
    node: process.version,
    lockSha256: hash(readFileSync("package-lock.json")),
    stage:
      "branch constraints only; no route movement or cross-channel bend ordering",
    maps: rows.length,
    affectedMaps: rows.filter((r) => r.groups).length,
    ...Object.fromEntries(
      ["edges", ...Object.keys(counts([]))].map((key) => [
        key,
        rows.reduce((n, r) => n + r[key], 0),
      ]),
    ),
  };
  await report(`${corpus}.json`, summary);
  console.log(JSON.stringify({ corpus, ...summary }, null, 2));
}
