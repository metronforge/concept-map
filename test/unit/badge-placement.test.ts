import { test, expect } from "vitest";
import { placeBadge } from "../../src/layout/stages/badge-placement";
const bounds: [number, number] = [200, 100];
test("a clear badge stays at its authored position", () => {
  expect(placeBadge([20, 20], [], bounds)).toEqual([20, 20]);
});
test("measured text bounds move a badge with clearance while staying inside the viewBox", () => {
  const text: [number, number, number, number] = [60, 25, 90, 25];
  const [x, y] = placeBadge([100, 40], [text], bounds);
  expect(
    Math.hypot(
      Math.max(text[0] - x, 0, x - text[0] - text[2]),
      Math.max(text[1] - y, 0, y - text[1] - text[3]),
    ),
  ).toBeGreaterThanOrEqual(11);
  expect(x).toBeGreaterThanOrEqual(8);
  expect(x).toBeLessThanOrEqual(192);
  expect(y).toBeGreaterThanOrEqual(8);
  expect(y).toBeLessThanOrEqual(92);
});

test("a step number over a box moves even without a label", () => {
  const node: [number, number, number, number] = [10, 10, 100, 36];
  expect(placeBadge([108, 12], [node], bounds)).not.toEqual([108, 12]);
});
