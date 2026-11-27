import { beforeEach, expect, test, vi } from "vitest";
import { createRouteInspector } from "../../../src/layout/inspect-routes.js";
import { newRoutingDefects } from "../../../src/layout/routing-defects.js";
import { fontTableMeasurer } from "../../../src/layout/measure.js";
import { routingFixture } from "./same-rank-routing-fixture.js";

vi.mock("../../../src/layout/routing-defects.js", () => ({
  newRoutingDefects: vi.fn(),
}));

const defects = vi.mocked(newRoutingDefects);
const conflict = [{ a: "line:ab", b: "node:c", band: "defect" as const }];

beforeEach(() => defects.mockReset());

for (const [pass, results] of [
  ["raw", [conflict, []]],
  ["refined", [[], conflict]],
] as const) {
  test(`rejects a candidate with a ${pass}-only hard defect`, () => {
    const fixture = routingFixture([]);
    defects.mockReturnValueOnce(results[0]).mockReturnValueOnce(results[1]);
    const inspect = createRouteInspector(
      fixture.source,
      fixture.graph,
      fixture.original,
      fontTableMeasurer,
      { measurer: fontTableMeasurer, widthEm: 39 },
    );

    expect(inspect(fixture.original)).toEqual(["ab"]);
    expect(defects).toHaveBeenCalledTimes(2);
    expect(defects.mock.calls[0][2]).not.toBe(defects.mock.calls[1][2]);
  });
}
