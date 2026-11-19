import { expect, test, vi } from "vitest";
import ELK from "elkjs/lib/elk.bundled.js";
import { layout } from "../../../src/layout/index";
import { elkEngine } from "../../../src/layout/elk";
import { SourceMapSchema } from "../../../src/schema";

test("port endpoints retain the scenario's forward edge priority at the ELK boundary", async () => {
  const run = vi.spyOn(ELK.prototype, "layout");
  try {
    const map = SourceMapSchema.parse({
      format: 3,
      id: "priority",
      title: "Priority",
      layers: { service: { label: "Service" } },
      nodes: {
        a: { label: "A", layer: "service" },
        b: { label: "B", layer: "service" },
      },
      edges: { ab: { from: "a", to: "b" } },
      scenarios: [
        {
          id: "all",
          label: "All",
          steps: [
            {
              id: "show",
              title: "Show",
              text: "",
              show: ["a", "b"],
              edges: ["ab"],
            },
          ],
        },
      ],
      layout: {
        hints: [{ kind: "side", edge: "ab", end: "from", side: "right" }],
      },
    });
    await layout(map, elkEngine);
    expect(
      run.mock.calls[0][0].edges?.[0].layoutOptions?.[
        "elk.layered.priority.direction"
      ],
    ).toBe("5");
  } finally {
    run.mockRestore();
  }
});
