import { expect, test } from "vitest";
import { layout, check } from "../../../src/layout/index.js";
import { dagreEngine } from "../../../src/layout/dagre.js";
import { elkEngine } from "../../../src/layout/elk.js";
import type { UnsupportedHint } from "../../../src/layout/types.js";
import { laneSource } from "./lane-rank-fixture.js";

for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const)
  for (const direction of ["down", "right"] as const) {
    test(`${name}/${direction}: layout aligns required groups and preserves lanes`, async () => {
      const source = laneSource(direction, false);
      const before = structuredClone(source);
      const plain = structuredClone(source);
      plain.layout.hints = [];
      const original = await layout(plain, engine, { intent: false });
      const resolved = await layout(source, engine, {
        intent: false,
        strict: true,
      });
      const axis = direction === "down" ? 1 : 0;
      expect(original.nodes.quick.box[axis]).not.toBe(
        original.nodes.finish.box[axis],
      );
      expect(resolved.nodes.quick.box[axis]).toBe(
        resolved.nodes.finish.box[axis],
      );
      expect(resolved.nodes.observer.box[axis]).toBeGreaterThan(
        original.nodes.observer.box[axis],
      );
      expect(resolved.nodes.start.box).toEqual(original.nodes.start.box);
      expect(resolved.edges.prepare).toEqual(original.edges.prepare);
      expect(check(source, resolved).hard).toBe(0);
      expect(check(source, resolved).constraints.every((c) => c.holds)).toBe(
        true,
      );
      expect(source).toEqual(before);
    });

    test(`${name}/${direction}: a forward-path contradiction names the hint and arrow`, async () => {
      const source = laneSource(direction, false);
      source.layout.hints[0].nodes = ["start", "prepare"];
      await expect(
        layout(source, engine, { intent: false }),
      ).rejects.toMatchObject({
        kind: "same-rank-contradiction",
        message: expect.stringMatching(/layout\.hints\[0\]/),
        data: {
          cycle: expect.arrayContaining([
            expect.objectContaining({ id: "edges.prepare" }),
          ]),
        },
      });
    });

    test(`${name}/${direction}: mixed refusals report once with checked conflicts`, async () => {
      const source = laneSource(direction, true);
      source.layout.hints[0].strength = "preferred";
      source.layout.hints.unshift({
        kind: "free",
        strength: "preferred",
        edge: "prepare",
      });
      const calls: (readonly UnsupportedHint[])[] = [];
      const resolved = await layout(source, engine, {
        intent: false,
        onUnsupportedHints: (h) => calls.push(h),
      });
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        expect.objectContaining({
          path: "layout.hints[0]",
          reason: "unsupported",
        }),
        expect.objectContaining({
          path: "layout.hints[1]",
          reason: "contradiction",
        }),
      ]);
      for (const path of ["lanes.first", "lanes.second", "layout.hints[1]"])
        expect(calls[0][1].conflicts?.some((id) => id.startsWith(path))).toBe(
          true,
        );
      expect(check(source, resolved).hard).toBe(0);
    });
  }
