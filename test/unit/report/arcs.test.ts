import { expect, it } from "vitest";
import { polylines } from "../../../src/layout/stages/paths";

it("checks absolute and relative arcs with both sweep directions", () => {
  const upper = polylines("M0 0 A5 5 0 0 1 10 0")[0];
  const lower = polylines("M0 0 a5 5 0 0 0 10 0")[0];
  expect(upper[0]).toEqual([0, 0]);
  expect(upper.at(-1)).toEqual([10, 0]);
  expect(upper[8][0]).toBeCloseTo(5);
  expect(upper[8][1]).toBeCloseTo(-5);
  expect(lower[8][1]).toBeCloseTo(5);
});

it("corrects too-small radii, rotation and degenerate arcs", () => {
  const enlarged = polylines("M0 0 A1 1 0 0 1 10 0")[0];
  expect(enlarged[8][1]).toBeCloseTo(-5);
  const rotated = polylines("M0 0 A10 5 90 0 1 10 0")[0];
  expect(rotated[8][0]).toBeCloseTo(5);
  expect(rotated[8][1]).toBeCloseTo(-10);
  expect(polylines("M0 0 A0 5 0 0 1 10 0")).toEqual([
    [
      [0, 0],
      [10, 0],
    ],
  ]);
  expect(polylines("M0 0 A5 5 0 0 1 0 0 L10 0")).toEqual([
    [
      [0, 0],
      [10, 0],
    ],
  ]);
});

it("uses the large-arc flag and resets smooth-curve controls", () => {
  const small = polylines("M10 0 A10 10 0 0 1 0 10")[0];
  const large = polylines("M10 0 A10 10 0 1 1 0 10")[0];
  expect(small[8][0]).toBeCloseTo(Math.sqrt(50));
  expect(large[8][0]).toBeCloseTo(10 + Math.sqrt(50));
  expect(
    polylines("M0 0 Q5 10 10 0 A5 5 0 0 1 20 0 T30 0")[0].at(-9)?.[1],
  ).toBeCloseTo(0);
});

it("treats paths without a stroke as empty geometry", () => {
  expect(polylines("M0 0")).toEqual([]);
  expect(polylines("M0 0 L0 0 A5 5 0 0 1 0 0")).toEqual([]);
});

it("accepts SVG's compact adjacent arc flags and endpoint", () => {
  expect(polylines("M0 0 A5 5 0 0110 0")).toEqual(
    polylines("M0 0 A5 5 0 0 1 10 0"),
  );
});
