import { expect, test } from "vitest";
import { graphSvg } from "../../../scripts/comparison/page.mjs";
import { resolvedFixture } from "../arbitraries/map";

test("standalone comparison SVG has one native-size width and height", () => {
  const map = resolvedFixture();
  map.viewBox = [315, 180];
  const root = graphSvg(map, "comparison", true).match(/^<svg\b[^>]*>/)![0];
  expect(root.match(/\bwidth="[^"]*"/g)).toEqual(['width="315"']);
  expect(root.match(/\bheight="[^"]*"/g)).toEqual(['height="180"']);
  expect(root).toContain('viewBox="0 0 315 180"');
  expect(root).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(graphSvg(map, "comparison")).toMatch(/^<svg width="480" /);
});
