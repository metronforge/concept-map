import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { hash } from "./metrics.mjs";
import { routeIssues } from "./route-audit.mjs";

export function sampleStats(samplesMs) {
  assert.equal(samplesMs.length, 5);
  assert.ok(samplesMs.every((n) => Number.isFinite(n) && n >= 0));
  const sorted = [...samplesMs].sort((a, b) => a - b);
  return { samplesMs, medianMs: sorted[2], minMs: sorted[0], maxMs: sorted[4] };
}

function validate(problem, routes) {
  assert.equal(routes.length, problem.edges.length);
  routes.forEach((route, i) => {
    assert.equal(route.id, problem.edges[i].id);
    assert.equal(route.failure, undefined);
    assert.deepEqual(routeIssues(problem, problem.edges[i], route), []);
  });
}

/** One warm-up, five synchronous calls; input copies and audits are untimed. */
export function timeRouter(
  candidate,
  problem,
  route,
  clock = () => performance.now(),
) {
  const before = structuredClone(problem);
  const warm = structuredClone(route(problem));
  validate(problem, warm);
  assert.deepEqual(problem, before);
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const input = structuredClone(problem);
    const start = clock();
    const actual = route(input);
    const elapsed = clock() - start;
    assert.deepEqual(input, before);
    assert.deepEqual(actual, warm);
    samples.push(elapsed);
  }
  return {
    id: problem.id,
    candidate,
    inputSha256: hash(JSON.stringify(problem)),
    routesSha256: hash(JSON.stringify(warm)),
    edges: problem.edges.length,
    routing: sampleStats(samples),
  };
}
