import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { ResolvedMapSchema } from "../../src/schema";
import { resolvedFixture } from "./fixtures/map";
import { resolvedMaps } from "./fixtures/maps";
test("resolved leaves use URLs and page links, root deeper has no spread wrapper", () => {
  const m = resolvedFixture();
  expect(ResolvedMapSchema.safeParse(m).success).toBe(true);
  m.scenarios[0].steps[0].sources[0].url = "not a URL";
  expect(ResolvedMapSchema.safeParse(m).success).toBe(false);
});
test("all 23 exported book maps conform to the resolved structure", () => {
  expect(resolvedMaps()).toHaveLength(23);
});
test("committed resolved JSON schema equals the generated schema", () => {
  expect(JSON.parse(readFileSync("resolved-map.schema.json", "utf8"))).toEqual(
    z.toJSONSchema(ResolvedMapSchema, { target: "draft-2020-12" }),
  );
});
