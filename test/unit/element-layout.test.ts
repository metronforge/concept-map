import { test, expect } from "vitest";
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
    const map = await resolveInput(source, undefined, name);
    expect(map.nodes.staff.box[0]).toBeGreaterThan(map.nodes.guest.box[0]);
    expect(map.edges.order.path).toMatch(/^M/);
  });
test("ready maps and callbacks bypass the layout attribute", async () => {
  const ready = resolvedFixture();
  expect(await resolveInput(ready, undefined, "invalid")).toEqual(ready);
  expect(await resolveInput(source, async () => ready, "invalid")).toEqual(
    ready,
  );
});
test("source maps need an explicit supported engine or callback", async () => {
  await expect(resolveInput(source)).rejects.toThrow("Source map needs layout");
  await expect(resolveInput(source, undefined, "invalid")).rejects.toThrow(
    'Unknown layout "invalid"',
  );
});
