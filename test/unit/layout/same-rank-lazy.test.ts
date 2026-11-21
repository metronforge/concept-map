import { expect, test, vi } from "vitest";
import { laneSource } from "./lane-rank-fixture.js";

const evaluated = vi.hoisted(() => ({ count: 0 }));
vi.mock("../../../src/layout/place-same-rank.js", async (original) => {
  evaluated.count++;
  return original();
});

test("plain, invalid and hand maps skip the lazy stage; stated same-rank loads it", async () => {
  const { layout } = await import("../../../src/layout/index.js");
  const { dagreEngine } = await import("../../../src/layout/dagre.js");
  const source = laneSource("down", false);
  const plain = structuredClone(source);
  plain.layout.hints = [];
  await layout(plain, dagreEngine);
  delete plain.layout;
  const resolved = await layout(plain, dagreEngine);
  expect(evaluated.count).toBe(0);
  await layout({ ...resolved, layout: source.layout }, dagreEngine);
  const invalid = structuredClone(source);
  invalid.layout.hints[0].nodes = ["missing", "quick"];
  await expect(layout(invalid, dagreEngine)).rejects.toThrow(/missing/);
  expect(evaluated.count).toBe(0);
  const aligned = await layout(source, dagreEngine, { intent: false });
  expect(evaluated.count).toBe(1);
  expect(aligned.nodes.quick.box[1]).toBe(aligned.nodes.finish.box[1]);
});
