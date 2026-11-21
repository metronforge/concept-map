import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { format } from "prettier";
import { inputs, sameRankInputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeChannel } from "./channel.mjs";
import { coupleChannels } from "./channel-coupling.mjs";
import { hash } from "./metrics.mjs";

const [directory, mode] = process.argv.slice(2);
assert.ok(
  directory && (!mode || mode === "--check"),
  "Usage: node experiments/routing/couplings.mjs <output-directory> [--check]",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");

async function report(file, data) {
  const path = join(directory, "track-coupling", file);
  const json = await format(JSON.stringify(data), { parser: "json" });
  assert.ok(json.trimEnd().split("\n").length <= 200, `${path}: too long`);
  if (mode === "--check") {
    assert.deepEqual(JSON.parse(readFileSync(path)), JSON.parse(json), path);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
}

function counts({ groups, bends, components }) {
  return {
    groups: groups.length,
    bends: bends.length,
    components: components.length,
    orderedComponents: components.filter((c) => c.orders !== null).length,
    blockedComponents: components.filter((c) => c.orders === null).length,
    orderedGroups: components.reduce(
      (n, c) => n + (c.orders ? c.groups.length : 0),
      0,
    ),
    blockedGroups: components.reduce(
      (n, c) => n + (c.orders ? 0 : c.groups.length),
      0,
    ),
  };
}

async function record(item) {
  const problem = prepare(item),
    routes = routeChannel(problem);
  const before = structuredClone(routes),
    result = coupleChannels(routes);
  assert.deepEqual(routes, before);
  const row = {
    id: item.id,
    inputSha256: hash(JSON.stringify(problem)),
    routesSha256: hash(JSON.stringify(routes)),
    edges: routes.length,
    ...counts(result),
  };
  await report(`${item.id}/summary.json`, row);
  for (const [index, bend] of result.bends.entries())
    await report(`${item.id}/bend-${index}.json`, bend);
  for (const [index, component] of result.components.entries())
    await report(`${item.id}/component-${index}.json`, {
      ...component,
      localCycles: component.groups.filter(
        (i) => result.groups[i].cycle.length,
      ),
    });
  return row;
}

for (const [corpus, cases] of [
  ["original", await inputs()],
  ["aligned", await sameRankInputs()],
]) {
  const rows = [];
  for (const item of cases) rows.push(await record(item));
  const empty = { groups: [], bends: [], components: [] };
  const summary = {
    node: process.version,
    lockSha256: hash(readFileSync("package-lock.json")),
    stage:
      "joint branch and shared-bend orders; no track coordinates or route movement",
    maps: rows.length,
    mapsWithBends: rows.filter((r) => r.bends).length,
    ...Object.fromEntries(
      ["edges", ...Object.keys(counts(empty))].map((key) => [
        key,
        rows.reduce((n, r) => n + r[key], 0),
      ]),
    ),
  };
  await report(`${corpus}.json`, summary);
  console.log(JSON.stringify({ corpus, ...summary }, null, 2));
}
