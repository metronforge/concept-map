import { describe, expect, it } from "vitest";
import { sharedChannels } from "../../src/layout/route/channel-tracks.js";
import {
  linkedGroups,
  sharedBends,
} from "../../src/layout/route/channel-bends.js";

describe("shared channel bends", () => {
  it("links shared turns with the correct order in every quadrant", () => {
    for (const dx of [-1, 1])
      for (const dy of [-1, 1]) {
        const groups = sharedChannels(
          ["a", "b"].map((id) => ({
            id,
            points: [
              [dx * 20, 0],
              [0, 0],
              [0, dy * 20],
            ],
          })),
        );
        const bends = sharedBends(groups);
        expect(bends).toHaveLength(1);
        expect(bends[0].sameOrder).toBe(dx * dy === 1);
        expect(linkedGroups(groups, bends)).toEqual([[0, 1]]);
      }
  });

  it("does not link opposite turns or nonadjacent segments", () => {
    const groups = sharedChannels([
      {
        id: "a",
        points: [
          [-20, 0],
          [0, 0],
          [0, -20],
          [20, -20],
          [20, 0],
          [0, 0],
          [0, 20],
        ],
      },
      {
        id: "b",
        points: [
          [-20, 0],
          [0, 0],
          [0, 20],
        ],
      },
    ]);
    expect(sharedBends(groups)).toEqual([]);
    expect(linkedGroups(groups, [])).toEqual(groups.map((_, i) => [i]));
  });
});
