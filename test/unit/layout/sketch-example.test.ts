import { expect, test } from "vitest";
import { exampleMaps } from "../../../scripts/comparison/maps.mjs";
import { layout, check } from "../../../src/layout/index.js";
import { elkEngine } from "../../../src/layout/elk.js";

test("sketch example compares plain, preferred and exact box positions", async () => {
  const examples = exampleMaps();
  const variants = ["sketch-plain", "sketch", "sketch-required"].map(
    (id) => examples.find((example) => example.id === id)?.source,
  );
  expect(variants.every(Boolean)).toBe(true);
  const [plain, preferred, required] = variants;
  expect(plain!.layout?.hints ?? []).toEqual([]);
  expect(preferred!.layout?.hints).toHaveLength(4);
  expect(required!.layout?.hints).toEqual(
    preferred!.layout?.hints?.map((hint) => ({
      ...hint,
      strength: "required",
    })),
  );
  const drawn = await Promise.all(
    variants.map((source) => layout(source!, elkEngine)),
  );
  for (let i = 0; i < drawn.length; i++)
    expect(check(variants[i]!, drawn[i]).hard).toBe(0);
  for (const hint of required!.layout!.hints) {
    if (hint.kind !== "pin") continue;
    const [x, y, width, height] = drawn[2].nodes[hint.node].box;
    expect([x + width / 2, y + height / 2]).toEqual(hint.at);
  }
});
