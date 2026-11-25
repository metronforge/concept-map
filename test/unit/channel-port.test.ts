import { expect, it } from "vitest";
import { channelPort } from "../../src/layout/route/channel-port.js";

it("places a port at the midpoint of the requested box side", () => {
  const box: [number, number, number, number] = [10, 20, 30, 40];
  expect(channelPort("a", box, "top")).toEqual({
    id: "a",
    kind: "node",
    point: [25, 20],
    sides: ["top"],
  });
  expect(channelPort("a", box, "right").point).toEqual([40, 40]);
  expect(channelPort("a", box, "bottom").point).toEqual([25, 60]);
  expect(channelPort("a", box, "left").point).toEqual([10, 40]);
});
