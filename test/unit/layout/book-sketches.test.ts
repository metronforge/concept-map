import { expect, test } from "vitest";
import { SourceMapSchema } from "../../../src/schema.js";
import { layout, check } from "../../../src/layout/index.js";
import { elkEngine } from "../../../src/layout/elk.js";
import {
  bookMaps,
  sketchSource,
  stripGeometry,
} from "../../../scripts/comparison/maps.mjs";

test("all book drawings become source sketches at their hand box centres", () => {
  const maps = bookMaps();
  expect(maps).toHaveLength(23);
  for (const { manual } of maps) {
    const source = sketchSource(manual);
    expect(SourceMapSchema.parse(source)).toEqual(source);
    expect(source.layout?.hints).toEqual(
      Object.entries(manual.nodes).map(([node, { box }]) => ({
        kind: "pin",
        node,
        at: [box[0] + box[2] / 2, box[1] + box[3] / 2],
        strength: "preferred",
      })),
    );
    const plain = stripGeometry(manual);
    expect({ ...source, layout: undefined }).toEqual({
      ...plain,
      layout: undefined,
    });
    expect(sketchSource(manual, "required").layout?.hints).toEqual(
      source.layout?.hints.map((hint) => ({ ...hint, strength: "required" })),
    );
  }
});

test("required book sketch keeps horizontal arrows between pinned peers", async () => {
  const manual = bookMaps().find(({ id }) => id === "1-2")!.manual;
  const source = sketchSource(manual, "required");
  const resolved = await layout(source, elkEngine);
  expect(check(source, resolved).hard).toBeLessThanOrEqual(
    check(source, manual).hard,
  );
  for (const [id, node] of Object.entries(manual.nodes)) {
    const [x, y, width, height] = resolved.nodes[id].box;
    expect([x + width / 2, y + height / 2]).toEqual([
      node.box[0] + node.box[2] / 2,
      node.box[1] + node.box[3] / 2,
    ]);
  }
});

test("required sketch moves a label clear of a node step number", async () => {
  const manual = bookMaps().find(({ id }) => id === "3-3")!.manual;
  const source = sketchSource(manual, "required");
  const resolved = await layout(source, elkEngine);
  expect(check(source, resolved).hard).toBeLessThanOrEqual(
    check(source, manual).hard,
  );
});

test("required sketch routes labels clear of node step numbers", async () => {
  const manual = bookMaps().find(({ id }) => id === "2-6")!.manual;
  const source = sketchSource(manual, "required");
  const resolved = await layout(source, elkEngine);
  expect(check(source, resolved).hard).toBeLessThanOrEqual(
    check(source, manual).hard,
  );
  for (const [id, node] of Object.entries(manual.nodes)) {
    const [x, y, width, height] = resolved.nodes[id].box;
    expect([x + width / 2, y + height / 2]).toEqual([
      node.box[0] + node.box[2] / 2,
      node.box[1] + node.box[3] / 2,
    ]);
  }
});
