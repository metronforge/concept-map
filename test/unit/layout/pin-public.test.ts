import { expect, test } from "vitest";
import { layout } from "../../../src/layout/index.js";
import { dagreEngine } from "../../../src/layout/dagre.js";
import { elkEngine } from "../../../src/layout/elk.js";
import { source } from "./same-rank-fixture.js";

for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const) {
  test(`${name}: a required pin fixes the box centre without same-rank hints`, async () => {
    const map = {
      ...source(),
      layout: {
        hints: [
          { kind: "pin", node: "a", at: [240, 120], strength: "required" },
        ],
      },
    };
    const before = structuredClone(map);
    const resolved = await layout(map, engine);
    const [x, y, width, height] = resolved.nodes.a.box;
    expect([x + width / 2, y + height / 2]).toEqual([240, 120]);
    expect(map).toEqual(before);
  });
}
