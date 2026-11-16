import { describe, expect, it } from "vitest";
import { test as property, fc } from "@fast-check/vitest";
import {
  circleGap,
  circleRectGap,
  crossings,
  rectGap,
  segmentRectGap,
  type Rect,
} from "../../../src/layout/stages/plane";
import { polylines } from "../../../src/layout/stages/paths";

const box: Rect = [0, 0, 10, 10];

describe("signed gaps", () => {
  it("are positive apart, zero touching and negative overlapping", () => {
    expect(rectGap(box, [13, 0, 5, 5])).toBe(3);
    expect(rectGap(box, [10, 2, 5, 5])).toBe(0);
    expect(rectGap(box, [8, 2, 5, 5])).toBe(-2);
    expect(circleRectGap([15, 5], 2, box)).toBe(3);
    expect(circleRectGap([9, 5], 2, box)).toBe(-3);
    expect(circleGap([0, 0], 1, [5, 0], 1)).toBe(3);
  });
  it("measure a segment against a box", () => {
    expect(segmentRectGap([-5, 13], [15, 13], box)).toBe(3);
    expect(segmentRectGap([13, -5], [13, 15], box)).toBe(3);
    // A horizontal line through the box must move 2 down or 8 up.
    expect(segmentRectGap([-5, 8], [15, 8], box)).toBe(-2);
    // Diagonal past a corner: nearest to (10, 10) at (13, 13).
    expect(segmentRectGap([12, 14], [16, 10], box)).toBeCloseTo(3 * Math.SQRT2);
    // A vertical line through a box must move to the nearer side.
    expect(segmentRectGap([3, -5], [3, 15], box)).toBe(-3);
  });
  property.prop([
    fc.integer({ min: -40, max: 40 }),
    fc.integer({ min: -40, max: 40 }),
    fc.integer({ min: -40, max: 40 }),
    fc.integer({ min: -40, max: 40 }),
  ])(
    "of a segment never exceed the gap of its end points",
    (x1, y1, x2, y2) => {
      const gap = segmentRectGap([x1, y1], [x2, y2], box);
      const ends = Math.min(
        circleRectGap([x1, y1], 0, box),
        circleRectGap([x2, y2], 0, box),
      );
      expect(gap).toBeLessThanOrEqual(Math.max(ends, 0) + 1e-9);
    },
  );
});

describe("SVG paths", () => {
  it("read absolute and relative lines", () => {
    expect(polylines("M0,0 H10 V5 l-10,0 z")).toEqual([
      [
        [0, 0],
        [10, 0],
        [10, 5],
        [0, 5],
        [0, 0],
      ],
    ]);
    expect(polylines("M0 0 L1 1 M5 5 l1 0")).toHaveLength(2);
  });
  it("turn curves into chords and refuse arcs", () => {
    const [line] = polylines("M0,0 C0,10 10,10 10,0");
    expect(line).toHaveLength(17);
    expect(line[8][1]).toBeCloseTo(7.5);
    expect(polylines("M0,0 Q5,10 10,0 T20,0")[0]).toHaveLength(33);
    expect(() => polylines("M0,0 A5,5 0 0 1 10,0")).toThrow(/Arc/);
    expect(() => polylines("L1,1")).toThrow(/moveto/);
  });
});

describe("crossings", () => {
  it("count lines that pass through each other", () => {
    expect(
      crossings(
        [
          [0, 5],
          [10, 5],
        ],
        [
          [5, 0],
          [5, 10],
        ],
      ),
    ).toEqual([[5, 5]]);
  });
  it("do not count lines that only touch or share an end", () => {
    const a = [
      [0, 5],
      [10, 5],
    ] as [number, number][];
    expect(
      crossings(a, [
        [5, 5],
        [5, 10],
      ]),
    ).toEqual([]);
    expect(
      crossings(a, [
        [10, 5],
        [10, 10],
      ]),
    ).toEqual([]);
    // Two lines meeting at a corner and turning back.
    expect(
      crossings(
        [
          [0, 0],
          [5, 5],
          [10, 0],
        ],
        [
          [0, 10],
          [5, 5],
          [10, 10],
        ],
      ),
    ).toEqual([]);
  });
});
