import { expect, it } from "vitest";
import { channelSides } from "../../src/layout/route/channel-sides.js";
import type { Constraint } from "../../src/layout/problem.js";

it("selects facing sides from placed box centres", () => {
  expect(channelSides([0, 0, 10, 10], [30, 4, 10, 10], "e", [])).toEqual({
    from: "right",
    to: "left",
  });
  expect(channelSides([0, 30, 10, 10], [0, 0, 10, 10], "e", [])).toEqual({
    from: "top",
    to: "bottom",
  });
});

it("honors explicit sides and gives required hints precedence", () => {
  const hints: Constraint[] = [
    { kind: "side", edge: "e", end: "from", side: "top", strength: "required" },
    {
      kind: "side",
      edge: "e",
      end: "from",
      side: "bottom",
      strength: "preferred",
    },
    {
      kind: "side",
      edge: "e",
      end: "to",
      side: "right",
      strength: "preferred",
    },
  ];
  expect(channelSides([0, 0, 10, 10], [30, 0, 10, 10], "e", hints)).toEqual({
    from: "top",
    to: "right",
  });
});
