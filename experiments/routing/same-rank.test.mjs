import assert from "node:assert/strict";
import { test } from "node:test";
import * as loaders from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeChannel } from "./channel.mjs";
import { routeIssues } from "./route-audit.mjs";
import { assemble } from "./assemble.mjs";
import { check } from "../../dist/layout/index.js";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("compare stretched and rerouted arrows on the same aligned boxes and ports", async () => {
  assert.equal(typeof loaders.sameRankInputs, "function");
  const cases = await loaders.sameRankInputs();
  assert.deepEqual(
    cases.map((item) => item.id),
    ["examples/dagre/same-rank", "examples/elk/same-rank"],
  );
  for (const item of cases) {
    const before = structuredClone(item);
    assert.equal(item.source.layout.hints[0].kind, "sameRank");
    assert.equal(item.source.layout.hints[0].strength, "required");
    assert.equal(
      item.resolved.nodes.quick.box[1],
      item.resolved.nodes.finish.box[1],
    );
    const problem = prepare(item),
      routes = routeChannel(problem);
    assert.equal(routes.length, 3);
    routes.forEach((route, i) => {
      assert.deepEqual(routeIssues(problem, problem.edges[i], route), []);
    });
    const routed = assemble(item, routes);
    for (const key of ["nodes", "viewBox", "lanes", "frames", "scenarios"])
      assert.deepEqual(routed[key], item.resolved[key]);
    assert.equal(check(item.source, routed).hard, 0);
    assert.deepEqual(item, before);
  }
});

test("reproduce aligned-route evidence and reject a changed quality result", () => {
  const directory = mkdtempSync(join(tmpdir(), "routing-aligned-"));
  const run = (...args) =>
    spawnSync(
      process.execPath,
      ["experiments/routing/same-rank.mjs", directory, ...args],
      { encoding: "utf8" },
    );
  try {
    const written = run();
    assert.equal(written.status, 0, written.stderr);
    const checked = run("--check");
    assert.equal(checked.status, 0, checked.stderr);
    const path = join(
      directory,
      "same-rank/channel/examples/dagre/same-rank.json",
    );
    const data = JSON.parse(readFileSync(path));
    data.quality.hard += 1;
    const altered = JSON.stringify(data);
    writeFileSync(path, altered);
    const rejected = run("--check");
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /same-rank/);
    assert.equal(readFileSync(path, "utf8"), altered);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
