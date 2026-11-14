import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { ResolvedMapSchema } from "../dist/index.js";
const path = new URL("../resolved-map.schema.json", import.meta.url);
const json =
  JSON.stringify(
    z.toJSONSchema(ResolvedMapSchema, { target: "draft-2020-12" }),
    null,
    2,
  ) + "\n";
if (process.argv.includes("--check")) {
  if ((await readFile(path, "utf8")) !== json)
    throw new Error("Resolved JSON schema is stale; run npm run schema");
} else await writeFile(path, json);
