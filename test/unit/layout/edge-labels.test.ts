import { test, expect } from "vitest";
import { dagreEngine } from "../../../src/layout/dagre";
import type { LayoutGraph } from "../../../src/layout/types";
for (const direction of ["down", "right"] as const)
  for (const lanes of [false, true]) {
    test(`dagre reserves label space beside ${direction} edges, lanes ${lanes}`, async () => {
      const graph: LayoutGraph = {
        direction,
        nodes: [
          { id: "a", width: 60, height: 36, ...(lanes ? { lane: "a" } : {}) },
          { id: "b", width: 60, height: 36, ...(lanes ? { lane: "b" } : {}) },
        ],
        edges: [
          {
            id: "ab",
            from: "a",
            to: "b",
            label: { text: "Long edge label", width: 150, height: 14 },
          },
        ],
        lanes: lanes
          ? [
              { id: "a", label: { width: 20, height: 14 } },
              { id: "b", label: { width: 20, height: 14 } },
            ]
          : [],
      };
      const result = await dagreEngine.layout(graph);
      const r = result.edges.ab;
      const [x, y] = r.label!;
      for (let i = 1; i < r.points.length; i++) {
        const a = r.points[i - 1],
          b = r.points[i];
        for (let t = 0; t <= 1; t += 0.01) {
          const px = a[0] + (b[0] - a[0]) * t,
            py = a[1] + (b[1] - a[1]) * t;
          expect(Math.abs(px - x) >= 75 + 4 || Math.abs(py - y) >= 7 + 4).toBe(
            true,
          );
        }
      }
      const a = result.nodes.a,
        b = result.nodes.b;
      expect(
        direction === "right" ? b[0] - a[0] - a[2] : b[1] - a[1] - a[3],
      ).toBeGreaterThanOrEqual(64);
    });
  }

test("dagre keeps a self-transition label in its reserved gap", async () => {
  const { readFileSync } = await import("node:fs");
  const { layout, measureLabel } = await import("../../../src/layout/index");
  const source = JSON.parse(readFileSync("examples/door/map.json", "utf8"));
  const map = await layout(source, dagreEngine),
    label = map.edges.blocked.label!;
  const size = measureLabel(label.text, { fontSize: 10.5, mono: true });
  for (const {
    box: [x, y, w, h],
  } of Object.values(map.nodes)) {
    expect(
      label.at[0] + size.width <= x ||
        label.at[0] >= x + w ||
        label.at[1] <= y ||
        label.at[1] - size.height >= y + h,
    ).toBe(true);
  }
});
