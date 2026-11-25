import assert from "node:assert/strict";
import { test } from "node:test";
import { inputs, sameRankInputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeIndependent } from "./channel-independent.mjs";
import { spaceChannels } from "./channel-spacing.mjs";
import { routeChannel } from "./channel.mjs";
import { assemble, outsideViewport } from "./assemble.mjs";
import { overlapAudit } from "./overlap.mjs";
import { measure, totals } from "./metrics.mjs";
import { routeIssues } from "./route-audit.mjs";

function audit(item, routes) {
  const resolved = assemble(item, routes);
  return {
    ...measure({ ...item, resolved }),
    outside: outsideViewport(resolved),
    overlap: overlapAudit(
      Object.entries(resolved.edges).map(([id, edge]) => ({
        id,
        path: edge.path,
      })),
    ),
  };
}

function checkReversal(input, raw, routes) {
  const reversed = raw.map((r) => ({
    ...r,
    points: [...r.points].reverse(),
  }));
  const reverseInput = {
    ...input,
    edges: input.edges.map((e) => ({ ...e, from: e.to, to: e.from })),
  };
  assert.deepEqual(
    spaceChannels(reverseInput, reversed),
    routes.map((r) => ({ ...r, points: [...r.points].reverse() })),
  );
}

test("ordered spacing meets the author's target with unchanged ports, boxes and aligned drawings", async () => {
  const reports = [];
  for (const item of [...(await inputs()), ...(await sameRankInputs())]) {
    const input = prepare(item),
      before = structuredClone(input);
    const raw = routeIndependent(input),
      original = structuredClone(raw);
    const routes = routeChannel(input),
      report = audit(item, routes);
    assert.deepEqual(spaceChannels(input, raw), routes);
    assert.deepEqual(input, before);
    assert.deepEqual(raw, original);
    assert.deepEqual(
      spaceChannels(input, [...raw].reverse()),
      [...routes].reverse(),
    );
    checkReversal(input, raw, routes);
    routes.forEach((route, i) =>
      assert.deepEqual(routeIssues(input, input.edges[i], route), []),
    );
    assert.deepEqual(report.outside, []);
    assert.equal(report.overlap.retracedLength, 0);
    if (item.id.endsWith("same-rank")) assert.deepEqual(routes, raw);
    else reports.push(report);
  }
  const result = totals(reports);
  assert.ok(result.hard <= 3);
  assert.ok(result.crossings <= 23);
  assert.ok(
    reports.reduce((n, r) => n + r.overlap.sharedLength, 0) <=
      290.9999995200001,
  );
});
