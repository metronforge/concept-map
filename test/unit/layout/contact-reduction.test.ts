import { expect, test } from "vitest";
import { contactReduction } from "../../../src/layout/stages/contact-reduction";
import { rectGap } from "../../../src/layout/stages/plane";
import type { LayoutBox } from "../../../src/layout/types";

test("a trapped label can reduce an overlap before it can remove a contact", () => {
  const obstacle: LayoutBox = [0, 0, 100, 100];
  const origin: LayoutBox = [30, 30, 40, 10];
  const score = contactReduction(origin, [(box) => rectGap(box, obstacle)])!;
  // Both positions overlap the box, but the second needs only a 10-unit
  // move to separate them instead of 40. A deeper overlap is still refused.
  expect(Number.isFinite(score([30, 0, 40, 10]))).toBe(true);
  expect(score([30, 35, 40, 10])).toBe(Infinity);
  expect(score(origin)).toBe(Infinity);
  expect(score([30, -11, 40, 10])).toBeLessThan(score([30, 0, 40, 10]));
});

test("reducing one overlap cannot introduce another or worsen an existing one", () => {
  const obstacles: LayoutBox[] = [
    [0, 0, 100, 100],
    [0, -20, 100, 10],
  ];
  const score = contactReduction(
    [30, 30, 40, 10],
    obstacles.map((obstacle) => (box: LayoutBox) => rectGap(box, obstacle)),
  )!;
  expect(score([30, -15, 40, 10])).toBe(Infinity);
  expect(score([30, 40, 40, 10])).toBe(Infinity);
});
