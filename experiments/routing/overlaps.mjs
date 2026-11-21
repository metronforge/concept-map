import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeChannel } from "./channel.mjs";
import { loadAvoid, routeAvoid } from "./avoid.mjs";
import { routeIssues } from "./route-audit.mjs";
import { hash } from "./metrics.mjs";
import { overlapAudit } from "./overlap.mjs";

const [directory, mode] = process.argv.slice(2);
assert.ok(
  directory && (!mode || mode === "--check"),
  "Usage: node experiments/routing/overlaps.mjs <output-directory> [--check]",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");

function report(file, data) {
  const path = join(directory, "overlap", file);
  const json = JSON.stringify(data, null, 2) + "\n";
  assert.ok(json.trimEnd().split("\n").length <= 200, `${path} is too long`);
  if (mode === "--check") {
    assert.deepEqual(
      JSON.parse(readFileSync(path, "utf8")),
      JSON.parse(json),
      path,
    );
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
}

function pathsFor(item, route) {
  if (!route)
    return Object.entries(item.resolved.edges).map(([id, edge]) => ({
      id,
      path: edge.path,
    }));
  const problem = prepare(item),
    routes = route(problem);
  assert.equal(routes.length, problem.edges.length);
  return routes.map((result, i) => {
    const edge = problem.edges[i];
    assert.equal(result.id, edge.id);
    assert.deepEqual(
      routeIssues(problem, edge, result),
      [],
      `${item.id}: ${edge.id}`,
    );
    return {
      id: result.id,
      path: `M${result.points.map((p) => p.join(" ")).join(" L")}`,
    };
  });
}

function audit(item, candidate, route) {
  const paths = pathsFor(item, route);
  const { pairs, retraced, ...measures } = overlapAudit(paths);
  const base = `${candidate}/${item.id}`;
  for (const [kind, entries] of [
    ["pairs", pairs],
    ["retraced", retraced],
  ])
    entries.forEach((entry, i) => report(`${base}/${kind}/${i}.json`, entry));
  const result = {
    id: item.id,
    candidate,
    edges: paths.length,
    referenceSha256: hash(JSON.stringify(item.resolved)),
    pathsSha256: hash(JSON.stringify(paths)),
    edgePairs: pairs.length,
    retracedEdges: retraced.length,
    ...measures,
  };
  report(`${base}/summary.json`, result);
  return result;
}

function totals(reports) {
  const keys = [
    "edges",
    "edgePairs",
    "sharedLength",
    "retracedEdges",
    "retracedLength",
    "ignoredDiagonalSegments",
    "ignoredDiagonalLength",
  ];
  return {
    maps: reports.length,
    mapsWithSharedRuns: reports.filter((r) => r.edgePairs > 0).length,
    ...Object.fromEntries(
      keys.map((key) => [
        key,
        reports.reduce((n, result) => n + result[key], 0),
      ]),
    ),
  };
}

const cases = await inputs(),
  avoid = await loadAvoid();
for (const [candidate, route] of [
  ["current", null],
  ["channel", routeChannel],
  ["libavoid", (problem) => routeAvoid(avoid, problem)],
]) {
  const reports = cases.map((item) => audit(item, candidate, route));
  const summary = {
    candidate,
    node: process.version,
    lockSha256: hash(readFileSync("package-lock.json")),
    experimentLockSha256: hash(
      readFileSync("experiments/routing/package-lock.json"),
    ),
    all: totals(reports),
    examples: totals(reports.filter((r) => r.id.startsWith("examples/"))),
    book: totals(reports.filter((r) => r.id.startsWith("book/"))),
  };
  report(`${candidate}/summary.json`, summary);
  console.log(JSON.stringify(summary, null, 2));
}
