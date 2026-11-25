import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { toJSONSchema } from "zod/v4/core";
import { SourceMapSchema, ResolvedMapSchema } from "../dist/schema.js";
import { validateReferences } from "../dist/schema/references.js";
import { stripGeometry } from "./comparison/maps.mjs";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const book = read("test/fixtures/book-maps.json");
const source = {
  format: 3,
  id: "baseline",
  title: "Baseline",
  layers: { process: { label: "Process" } },
  nodes: { first: { label: "First", layer: "process" } },
  scenarios: [
    {
      id: "normal",
      label: "Normal",
      steps: [{ id: "start", title: "Start", text: "Start here" }],
    },
  ],
};
const resolved = {
  ...source,
  viewBox: [200, 100],
  nodes: { first: { ...source.nodes.first, box: [0, 0, 100, 50] } },
};
const schemas = { source: SourceMapSchema, resolved: ResolvedMapSchema };

function schemaBytes() {
  return Object.entries(schemas).map(([name, schema]) => {
    const generated =
      JSON.stringify(
        toJSONSchema(schema, { target: "draft-2020-12", io: "input" }),
        null,
        2,
      ) + "\n";
    const committed = readFileSync(`${name}-map.schema.json`, "utf8");
    return {
      name,
      bytes: Buffer.byteLength(generated),
      sha256: hash(generated),
      equalsCommitted: generated === committed,
    };
  });
}

function errors() {
  return Object.entries(schemas).flatMap(([name, schema]) => {
    const base = name === "source" ? source : resolved;
    const cases = {
      missingField: ({ title: _title, ...map }) => map,
      wrongType: (map) => ({ ...map, title: 42 }),
      unknownKey: (map) => ({ ...map, surprise: true }),
      unknownLayer: (map) => {
        map.nodes.first.layer = "missing";
        return map;
      },
      badReference: (map) => {
        map.scenarios[0].steps[0].show = ["missing"];
        return map;
      },
    };
    return Object.entries(cases).map(([mistake, change]) => {
      const result = schema.safeParse(change(structuredClone(base)));
      if (!result.success)
        return {
          schema: name,
          mistake,
          boundary: "schema",
          issues: result.error.issues,
          message: result.error.message,
        };
      assert.equal(
        mistake,
        "badReference",
        `${name}: ${mistake} unexpectedly passed`,
      );
      let message;
      try {
        validateReferences(result.data);
      } catch (error) {
        message = error.message;
      }
      assert.equal(
        typeof message,
        "string",
        "bad reference unexpectedly passed",
      );
      return { schema: name, mistake, boundary: "validateReferences", message };
    });
  });
}

function parsedMaps() {
  const maps = book.map(({ id, map }) => ({
    id,
    resolved: hash(JSON.stringify(ResolvedMapSchema.parse(map))),
    source: hash(JSON.stringify(stripGeometry(map))),
  }));
  const examples = ["coffee", "door", "gcd", "side-hints", "same-rank"].map(
    (id) => ({
      id,
      source: hash(
        JSON.stringify(SourceMapSchema.parse(read(`examples/${id}/map.json`))),
      ),
    }),
  );
  return {
    book: maps,
    examples,
    defaults: {
      source: SourceMapSchema.parse(source),
      resolved: ResolvedMapSchema.parse(resolved),
    },
  };
}

const reports = { schemas: schemaBytes, errors, maps: parsedMaps };
assert.ok(
  Object.hasOwn(reports, process.argv[2]),
  "usage: node scripts/zod-compatibility.mjs schemas|errors|maps",
);
console.log(JSON.stringify(reports[process.argv[2]](), null, 2));
