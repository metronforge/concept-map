import { expect, it } from "vitest";
import { chooseRoute } from "../../src/layout/route/choose-route.js";

it("uses a safe channel candidate before considering the stretched route", () => {
  const inspected: string[] = [];
  const chosen = chooseRoute(
    "channel",
    () => "stretch",
    (candidate) => {
      inspected.push(candidate);
      return [];
    },
  );
  expect(chosen).toEqual({ result: "channel", conflicts: [] });
  expect(inspected).toEqual(["channel"]);
});

it("falls back when the channel is unavailable or adds defects", () => {
  for (const channel of [null, "channel"]) {
    const chosen = chooseRoute(
      channel,
      () => "stretch",
      (candidate) => (candidate === "channel" ? ["ab"] : []),
    );
    expect(chosen).toEqual({ result: "stretch", conflicts: [] });
  }
});

it("reports the stretched route's conflicts when neither candidate is safe", () => {
  const chosen = chooseRoute(
    "channel",
    () => "stretch",
    (candidate) => [candidate],
  );
  expect(chosen).toEqual({ result: "stretch", conflicts: ["stretch"] });
});
