import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { timeRouter, sampleStats } from "./timing.mjs";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { hash } from "./metrics.mjs";

const problem = {
  id: "straight",
  nodes: [
    { id: "a", box: [0, 0, 10, 10] },
    { id: "b", box: [20, 0, 10, 10] },
  ],
  edges: [
    {
      id: "ab",
      from: { id: "a", kind: "node", point: [10, 5], sides: ["right"] },
      to: { id: "b", kind: "node", point: [20, 5], sides: ["left"] },
    },
  ],
};
const routes = [
  {
    id: "ab",
    points: [
      [10, 5],
      [20, 5],
    ],
  },
];

test("time only five routing calls after one untimed warm-up", () => {
  const events = [];
  const ticks = [10, 15, 20, 21, 30, 33, 40, 42, 50, 54];
  const result = timeRouter(
    "test",
    problem,
    () => {
      events.push("route");
      return routes;
    },
    () => {
      events.push("clock");
      return ticks.shift();
    },
  );
  assert.deepEqual(events, [
    "route",
    ...Array.from({ length: 5 }, () => ["clock", "route", "clock"]).flat(),
  ]);
  assert.deepEqual(result.routing, {
    samplesMs: [5, 1, 3, 2, 4],
    medianMs: 3,
    minMs: 1,
    maxMs: 5,
  });
});

test("reject bad geometry, mutation and nondeterminism before publishing timings", () => {
  assert.throws(() =>
    timeRouter("bad", problem, () => [{ ...routes[0], failure: "no route" }]),
  );
  assert.throws(() =>
    timeRouter("bad", structuredClone(problem), (p) => {
      p.id = "changed";
      return routes;
    }),
  );
  let calls = 0;
  assert.throws(() =>
    timeRouter("bad", problem, () => (++calls === 1 ? routes : [])),
  );
  for (const samples of [[], [1, 2, 3, 4, NaN], [1, 2, 3, 4, -1]])
    assert.throws(() => sampleStats(samples));
});

test("every recorded timing identifies the audited inputs and unchanged routes", async () => {
  const root = "docs/evidence/routing-experiment";
  for (const item of await inputs()) {
    for (const candidate of ["channel", "libavoid"]) {
      const read = (path) => JSON.parse(readFileSync(`${root}/${path}.json`));
      const timing = read(`timing/${candidate}/${item.id}`);
      const geometry = read(`${candidate}-geometry/${item.id}`);
      assert.equal(timing.id, item.id);
      assert.equal(timing.candidate, candidate);
      assert.equal(timing.inputSha256, hash(JSON.stringify(prepare(item))));
      assert.equal(timing.routesSha256, geometry.routesSha256);
      assert.equal(timing.edges, geometry.routed);
      assert.deepEqual(timing.routing, sampleStats(timing.routing.samplesMs));
    }
  }
});

test("recorded timing totals agree with all 29 per-map reports", async () => {
  const root = "docs/evidence/routing-experiment/timing";
  const read = (file) => JSON.parse(readFileSync(`${root}/${file}.json`));
  const summary = read("summary");
  const cases = await inputs();
  for (const candidate of ["channel", "libavoid"]) {
    const reports = cases.map((item) => read(`${candidate}/${item.id}`));
    const medians = reports
      .map((r) => r.routing.medianMs)
      .sort((a, b) => a - b);
    assert.deepEqual(summary[candidate], {
      maps: 29,
      edges: reports.reduce((sum, r) => sum + r.edges, 0),
      sumOfMapMediansMs: medians.reduce((sum, n) => sum + n, 0),
      medianMapMs: medians[14],
      minMapMedianMs: medians[0],
      maxMapMedianMs: medians.at(-1),
    });
  }
  assert.equal(summary.lockSha256, hash(readFileSync("package-lock.json")));
  assert.equal(
    summary.experimentLockSha256,
    hash(readFileSync("experiments/routing/package-lock.json")),
  );
});
