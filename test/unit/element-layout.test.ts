import { test, expect, vi } from "vitest";
import * as loader from "../../src/element/layout";
import { layout } from "../../src/layout/index";
import { dagreEngine } from "../../src/layout/dagre";
import { elkEngine } from "../../src/layout/elk";
import { SourceMapSchema } from "../../src/schema";
import { resolveInput } from "../../src/element/input";
import { resolvedFixture } from "./fixtures/map";

const source = {
  format: 3,
  id: "queue",
  title: "Queue",
  direction: "right",
  layers: { service: { label: "Service" } },
  nodes: {
    guest: { label: "Guest", layer: "service" },
    staff: { label: "Staff", layer: "service" },
  },
  edges: { order: { from: "guest", to: "staff", label: "Order" } },
  scenarios: [
    {
      id: "normal",
      label: "Normal",
      steps: [
        {
          id: "order",
          title: "Order",
          text: "Order coffee",
          show: ["guest", "staff"],
          edges: ["order"],
        },
      ],
    },
  ],
};
for (const name of ["dagre", "elk"])
  test(`layout attribute resolves source geometry with ${name}`, async () => {
    const { map, narrowLayout } = await resolveInput(source, undefined, name);
    expect(map.nodes.staff.box[0]).toBeGreaterThan(map.nodes.guest.box[0]);
    expect(map.edges.order.path).toMatch(/^M/);
    const widthEm = 8;
    const narrow = await narrowLayout!(widthEm);
    expect(narrow).toEqual(
      await layout(
        SourceMapSchema.parse(source),
        name === "dagre" ? dagreEngine : elkEngine,
        { widthEm },
      ),
    );
    expect(narrow.nodes.guest.box[2]).toBeGreaterThan(map.nodes.guest.box[2]);
  });
test("ready maps and callbacks bypass the layout attribute", async () => {
  const ready = resolvedFixture();
  expect(await resolveInput(ready, undefined, "invalid")).toEqual({
    map: ready,
  });
  expect(await resolveInput(source, async () => ready, "invalid")).toEqual({
    map: ready,
  });
});
test("source maps need an explicit supported engine or callback", async () => {
  await expect(resolveInput(source)).rejects.toThrow("Source map needs layout");
  await expect(resolveInput(source, undefined, "invalid")).rejects.toThrow(
    'Unknown layout "invalid"',
  );
});

test("narrow resolution is lazy and retains the parsed source and chosen engine", async () => {
  const ready = resolvedFixture();
  const load = vi.spyOn(loader, "layoutWithEngine").mockResolvedValue(ready);
  try {
    const input = structuredClone(source);
    const resolved = await resolveInput(input, undefined, "elk");
    expect(load).toHaveBeenCalledTimes(1);
    const parsed = structuredClone(load.mock.calls[0][0]);
    input.nodes.guest.label = "Changed after mounting";
    expect(await resolved.narrowLayout!(23.5)).toBe(ready);
    expect(load).toHaveBeenLastCalledWith(parsed, "elk", 23.5);
    expect(load).toHaveBeenCalledTimes(2);
  } finally {
    load.mockRestore();
  }
});
