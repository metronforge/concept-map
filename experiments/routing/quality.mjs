import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeChannel } from "./channel.mjs";
import { loadAvoid, routeAvoid } from "./avoid.mjs";
import { routeIssues } from "./route-audit.mjs";
import { assemble, outsideViewport } from "./assemble.mjs";
import { hash, measure, totals } from "./metrics.mjs";

const [directory, mode] = process.argv.slice(2);
assert.ok(
  directory && (!mode || mode === "--check"),
  "Usage: node experiments/routing/quality.mjs <output-directory> [--check]",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");

function report(file, data) {
  const path = join(directory, "quality", file);
  if (mode === "--check") {
    // JSON stores the checker's rounded -0 gaps as 0; compare stored values.
    assert.deepEqual(
      JSON.parse(readFileSync(path, "utf8")),
      JSON.parse(JSON.stringify(data)),
      path,
    );
    return;
  }
  const json = JSON.stringify(data, null, 2) + "\n";
  assert.ok(json.trimEnd().split("\n").length <= 200, `${path} is too long`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
}

function audit(item, candidate, route) {
  const problem = prepare(item);
  const routes = route(problem);
  for (const [i, edge] of problem.edges.entries()) {
    assert.equal(routes[i]?.id, edge.id);
    assert.deepEqual(
      routeIssues(problem, edge, routes[i]),
      [],
      `${item.id}: ${edge.id}`,
    );
  }
  const resolved = assemble(item, routes);
  return {
    ...measure({ ...item, resolved }),
    candidate,
    inputSha256: hash(JSON.stringify(problem)),
    routesSha256: hash(JSON.stringify(routes)),
    outsideViewport: outsideViewport(resolved),
  };
}

const cases = await inputs();
const avoid = await loadAvoid();
for (const [candidate, route] of [
  ["channel", routeChannel],
  ["libavoid", (problem) => routeAvoid(avoid, problem)],
]) {
  const reports = cases.map((item) => audit(item, candidate, route));
  for (const result of reports)
    report(`${candidate}/${result.id}.json`, result);
  const summary = {
    candidate,
    stage: "fixed viewport and shared font-table annotation placement",
    node: process.version,
    lockSha256: hash(readFileSync("package-lock.json")),
    experimentLockSha256: hash(
      readFileSync("experiments/routing/package-lock.json"),
    ),
    all: totals(reports),
    examples: totals(reports.filter((r) => r.id.startsWith("examples/"))),
    book: totals(reports.filter((r) => r.id.startsWith("book/"))),
    outsideViewport: reports
      .filter((r) => r.outsideViewport.length)
      .map((r) => ({
        id: r.id,
        edges: r.outsideViewport,
      })),
  };
  report(`${candidate}/summary.json`, summary);
  console.log(JSON.stringify(summary, null, 2));
}
