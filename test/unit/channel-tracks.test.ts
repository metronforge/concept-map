import { describe, expect, it } from "vitest";
import { sharedChannels } from "../../src/layout/route/channel-tracks.js";

describe("shared channels", () => {
  it("joins overlapping runs but separates point contacts", () => {
    const routes = [
      {
        id: "a",
        points: [
          [0, 0],
          [10, 0],
          [20, 0],
        ],
      },
      {
        id: "b",
        points: [
          [10, 0],
          [30, 0],
        ],
      },
      {
        id: "c",
        points: [
          [30, 0],
          [40, 0],
        ],
      },
    ];
    const groups = sharedChannels(routes);
    expect(groups).toHaveLength(1);
    expect(groups[0].segments.map((segment) => segment.edge)).toEqual([
      "a",
      "b",
    ]);
    expect([groups[0].start, groups[0].end]).toEqual([0, 30]);
    expect(sharedChannels([...routes].reverse())).toEqual(groups);
  });

  it("rejects duplicate ids and invalid segments", () => {
    const route = {
      id: "a",
      points: [
        [0, 0],
        [1, 0],
      ],
    };
    expect(() => sharedChannels([route, route])).toThrow("Duplicate route id");
    expect(() =>
      sharedChannels([
        {
          id: "b",
          points: [
            [0, 0],
            [1, 1],
          ],
        },
      ]),
    ).toThrow();
  });
});
