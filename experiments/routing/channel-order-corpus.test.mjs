import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inputs, sameRankInputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeChannel } from "./channel.mjs";
import { orderChannels } from "./channel-order.mjs";
import { overlapAudit } from "./overlap.mjs";
import { hash } from "./metrics.mjs";

function checkOrder(group) {
  if (group.order) {
    assert.deepEqual(
      [...group.order].sort((a, b) => a - b),
      group.segments.map((_, i) => i),
    );
    for (const rule of group.constraints)
      assert.ok(
        group.order.indexOf(rule.before) < group.order.indexOf(rule.after),
      );
    assert.deepEqual(group.cycle, []);
    return;
  }
  assert.ok(group.cycle.length >= 3);
  assert.equal(group.cycle[0], group.cycle.at(-1));
  for (let i = 1; i < group.cycle.length; i++)
    assert.ok(
      group.constraints.some(
        (r) => r.before === group.cycle[i - 1] && r.after === group.cycle[i],
      ),
    );
}

function checkSpans(routes, groups) {
  const audit = overlapAudit(
    routes.map(({ id, points }) => ({
      id,
      path: `M${points.map((p) => p.join(" ")).join(" L")}`,
    })),
  );
  for (const { edges, spans } of audit.pairs) {
    for (const span of spans) {
      const matching = groups.filter(
        (group) =>
          group.axis === (span.axis === "x" ? 0 : 1) &&
          group.coordinate === span.coordinate &&
          edges.every((edge) =>
            group.segments.some(
              (s) =>
                s.edge === edge && s.start <= span.start && s.end >= span.end,
            ),
          ),
      );
      assert.equal(matching.length, 1, JSON.stringify({ edges, span }));
    }
  }
  return audit.pairs.length;
}

// Segment numbers depend on arrow direction; the geometry and edge order do not.
function named(group) {
  const edge = (i) => group.segments[i].edge;
  return {
    axis: group.axis,
    coordinate: group.coordinate,
    start: group.start,
    end: group.end,
    order: group.order?.map(edge) ?? null,
    unique: group.unique,
    constraints: group.constraints.map((r) => ({
      ...r,
      before: edge(r.before),
      after: edge(r.after),
    })),
    cycle: group.cycle.map(edge),
  };
}

test("every corpus overlap receives an order or a checked conflict without changing routes", async () => {
  let groupCount = 0,
    pairs = 0,
    conflicts = 0;
  for (const item of [...(await inputs()), ...(await sameRankInputs())]) {
    const routes = routeChannel(prepare(item)),
      before = structuredClone(routes);
    const groups = orderChannels(routes);
    groups.forEach(checkOrder);
    pairs += checkSpans(routes, groups);
    groupCount += groups.length;
    conflicts += groups.filter((g) => g.cycle.length).length;
    assert.deepEqual(orderChannels([...routes].reverse()), groups);
    const reversed = routes.map((r) => ({
      ...r,
      points: [...r.points].reverse(),
    }));
    assert.deepEqual(orderChannels(reversed).map(named), groups.map(named));
    assert.deepEqual(routes, before);
    const base = item.id.endsWith("same-rank")
      ? "same-rank/timing"
      : "channel-geometry";
    const stored = JSON.parse(
      readFileSync(`docs/evidence/routing-experiment/${base}/${item.id}.json`),
    );
    assert.equal(hash(JSON.stringify(routes)), stored.routesSha256);
  }
  assert.deepEqual(
    { groupCount, pairs, conflicts },
    { groupCount: 35, pairs: 42, conflicts: 4 },
  );
});
