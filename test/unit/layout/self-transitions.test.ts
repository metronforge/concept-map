import { test, expect } from "vitest";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
import type { LayoutGraph } from "../../../src/layout/types";
for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const)
  for (const direction of ["down", "right"] as const)
    for (const label of [undefined, { text: "Retry", width: 100, height: 14 }])
      test(`${name} ${direction} self-transition with label ${!!label} returns to its node`, async () => {
        const graph: LayoutGraph = {
          direction,
          nodes: [{ id: "a", width: 80, height: 40 }],
          edges: [
            { id: "loop", from: "a", to: "a", ...(label ? { label } : {}) },
          ],
          lanes: [],
        };
        const result = await engine.layout(graph),
          points = result.edges.loop.points,
          [x, y, w, h] = result.nodes.a;
        const boundary = ([px, py]: number[]) =>
          px >= x - 1e-6 &&
          px <= x + w + 1e-6 &&
          py >= y - 1e-6 &&
          py <= y + h + 1e-6 &&
          (Math.abs(px - x) < 1e-6 ||
            Math.abs(px - x - w) < 1e-6 ||
            Math.abs(py - y) < 1e-6 ||
            Math.abs(py - y - h) < 1e-6);
        expect(boundary(points[0])).toBe(true);
        expect(boundary(points.at(-1)!)).toBe(true);
        expect(points[0]).not.toEqual(points.at(-1));
        expect(
          points.some(
            ([px, py]) => px < x || px > x + w || py < y || py > y + h,
          ),
        ).toBe(true);
        const area =
          Math.abs(
            points.reduce((sum, p, i) => {
              const q = points[(i + 1) % points.length];
              return sum + p[0] * q[1] - q[0] * p[1];
            }, 0),
          ) / 2;
        expect(area).toBeGreaterThan(50);
      });
