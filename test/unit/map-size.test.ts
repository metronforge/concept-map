import { test, expect } from "vitest";
import { renderSvg } from "../../src/render/svg";
import { resolvedFixture } from "./arbitraries/map";
test("SVG caps its rendered width at the map viewBox width", () => {
  const map = resolvedFixture();
  map.viewBox = [320, 180];
  expect(renderSvg(map)).toContain('style="max-width:320px"');
});
