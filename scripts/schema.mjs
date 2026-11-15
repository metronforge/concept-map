import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { SourceMapSchema, ResolvedMapSchema } from "../dist/index.js";
for (const [name, schema] of [
  ["source", SourceMapSchema],
  ["resolved", ResolvedMapSchema],
]) {
  const path = new URL(`../${name}-map.schema.json`, import.meta.url);
  const json =
    JSON.stringify(
      z.toJSONSchema(schema, { target: "draft-2020-12", io: "input" }),
      null,
      2,
    ) + "\n";
  if (process.argv.includes("--check")) {
    if ((await readFile(path, "utf8")) !== json)
      throw new Error(`${name} JSON schema is stale; run npm run schema`);
  } else await writeFile(path, json);
}
