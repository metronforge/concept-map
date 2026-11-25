import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as classic from "zod";
import * as mini from "zod/mini";

// Run against either build; importing classic here intentionally tests mixed use,
// not locale initialization (which zod-compatibility.mjs measures separately).
const [variant, directory = "."] = process.argv.slice(2);
assert.ok(["classic", "mini"].includes(variant));
const { sourceMapSchema, mapSchema, SourceMapSchema, ResolvedMapSchema } =
  await import(pathToFileURL(resolve(directory, "dist/schema.js")).href);
const defaults = JSON.parse(
  readFileSync("docs/evidence/zod-mini/classic/maps.json", "utf8"),
).defaults;
const isMini = variant === "mini";
const schemas = { source: SourceMapSchema, resolved: ResolvedMapSchema };
const report = { variant, schemas: {}, operations: {} };
for (const [name, schema] of Object.entries(schemas)) {
  const result = schema.safeParse({ ...defaults[name], title: 42 });
  assert.equal(result.success, false);
  const error = result.error;
  report.schemas[name] = {
    classicObject: schema instanceof classic.ZodObject,
    methods: Object.fromEntries(
      [
        "parse",
        "safeParse",
        "extend",
        "safeExtend",
        "optional",
        "default",
        "superRefine",
        "transform",
      ].map((key) => [key, typeof schema[key]]),
    ),
    error: {
      classicZodError: error instanceof classic.ZodError,
      coreZodError: error instanceof mini.core.$ZodError,
      nativeError: error instanceof Error,
      flatten: typeof error.flatten,
      format: typeof error.format,
    },
  };
  assert.equal(error instanceof classic.ZodError, !isMini);
  assert.equal(error instanceof mini.core.$ZodError, true);
  assert.equal(error instanceof Error, true);
  const added = { author: classic.string() };
  // Refinements permit additions, but replacing a field needs safeExtend.
  const plain = isMini ? mini.extend(schema, added) : schema.extend(added);
  assert.equal(
    plain.parse({ ...defaults[name], author: "Reader" }).author,
    "Reader",
  );
  const replacement = { title: classic.string().min(1) };
  assert.throws(() =>
    isMini ? mini.extend(schema, replacement) : schema.extend(replacement),
  );
  const extended = isMini
    ? mini.safeExtend(schema, { ...added, ...replacement })
    : schema.safeExtend({ ...added, ...replacement });
  assert.equal(
    extended.parse({ ...defaults[name], author: "Reader" }).author,
    "Reader",
  );
  const invalid = structuredClone(defaults[name]);
  invalid.nodes.first.layer = "missing";
  assert.equal(
    extended.safeParse({ ...invalid, author: "Reader" }).success,
    false,
  );
}
const leaves = {
  text: classic.string(),
  source: classic.object({ file: classic.string() }),
  deeper: classic.string(),
};
for (const [name, factory] of [
  ["source", sourceMapSchema],
  ["resolved", mapSchema],
]) {
  const structural = factory(leaves);
  const refine = (map, ctx) => {
    if (map.title === "Forbidden")
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Choose another title",
      });
  };
  const authored = isMini
    ? structural.check(mini.superRefine(refine))
    : structural.superRefine(refine);
  const input = structuredClone(defaults[name]);
  input.scenarios[0].steps[0].sources = [{ file: "src/example.ts" }];
  input.scenarios[0].steps[0].deeper = ["2.1"];
  assert.deepEqual(authored.parse(input), input);
  assert.equal(
    authored.safeParse({ ...input, title: "Forbidden" }).success,
    false,
  );
  // A classic outer pipe keeps classic schema methods for build-time consumers.
  const transformed = isMini
    ? classic.pipe(
        authored,
        classic.transform((map) => ({ ...map, title: "Changed" })),
      )
    : authored.transform((map) => ({ ...map, title: "Changed" }));
  assert.equal(transformed.parse(input).title, "Changed");
  assert.equal(transformed instanceof classic.ZodType, true);
  const extended = isMini
    ? mini.extend(structural, { author: classic.string() })
    : structural.extend({ author: classic.string() });
  assert.equal(extended.parse({ ...input, author: "Reader" }).author, "Reader");
}
report.operations = {
  classicLeavesInBothFactories: true,
  refinementAndTransform: true,
  classicOuterPipe: true,
  unrefinedKernelExtension: true,
  concreteAdditionAllowed: true,
  concretePlainReplacementRejected: true,
  safeExtensionPreservesLayerChecks: true,
};
console.log(JSON.stringify(report, null, 2));
