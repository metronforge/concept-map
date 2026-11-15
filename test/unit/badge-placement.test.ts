import { test, expect } from "vitest";
import { placeBadge } from "../../src/model/badge-placement";
const bounds = { x: 0, y: 0, width: 200, height: 100 };
test("a clear badge stays at its authored position", () => {
  expect(placeBadge([20, 20], 8, [], bounds)).toEqual([20, 20]);
});
test("measured text bounds move a badge with clearance while staying inside the viewBox", () => {
  const text = { x: 60, y: 25, width: 90, height: 25 };
  const [x, y] = placeBadge([100, 40], 8, [text], bounds);
  expect(
    Math.hypot(
      Math.max(text.x - x, 0, x - text.x - text.width),
      Math.max(text.y - y, 0, y - text.y - text.height),
    ),
  ).toBeGreaterThanOrEqual(11);
  expect(x).toBeGreaterThanOrEqual(8);
  expect(x).toBeLessThanOrEqual(192);
  expect(y).toBeGreaterThanOrEqual(8);
  expect(y).toBeLessThanOrEqual(92);
});

test("node badges retain their attachment when no label collides", () => {
  const node = { x: 10, y: 10, width: 100, height: 36 };
  expect(placeBadge([108, 12], 8, [], bounds, [node])).toEqual([108, 12]);
});
