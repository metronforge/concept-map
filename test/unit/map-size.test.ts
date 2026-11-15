import { test, expect } from "vitest";
import { renderSvg } from "../../src/render/svg";
import { resolvedFixture } from "./arbitraries/map";
test("server SVG scales layout units to readable text without inline sizing", () => {
  const map = resolvedFixture();
  map.viewBox = [315, 180];
  expect(renderSvg(map)).toMatch(/^<svg width="480" viewBox=/);
  expect(renderSvg(map)).not.toContain("max-width:");
});
