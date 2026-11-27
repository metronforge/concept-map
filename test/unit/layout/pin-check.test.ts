import { expect, test } from "vitest";
import { check } from "../../../src/layout/index";
import { resolvedFixture } from "../fixtures/map";

test("pin verdicts use box centres and report preferred distance", () => {
  const map = resolvedFixture();
  map.layout = {
    hints: [
      { kind: "pin", node: "a", at: [35, 25], strength: "required" },
      { kind: "pin", node: "b", at: [13, 115], strength: "preferred" },
    ],
  };
  const verdicts = check(map, map).constraints.filter((c) => c.kind === "pin");
  expect(verdicts[0]).toMatchObject({ kind: "pin", holds: true });
  expect(verdicts[1]).toMatchObject({ kind: "pin", holds: null });
  expect(verdicts[1].message).toContain("22");
  map.layout.hints[0].at = [36, 25];
  expect(
    check(map, map).constraints.find((c) => c.kind === "pin"),
  ).toMatchObject({
    holds: false,
  });
});
