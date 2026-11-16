import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { layout } from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
import hashes from "./example-hashes.json";

// Captured from main 31828b5 before the shared-problem refactor.
for (const name of ["coffee", "door", "gcd"] as const)
  for (const [id, engine] of [
    ["dagre", dagreEngine],
    ["elk", elkEngine],
  ] as const)
    test(`${name} ${id}: complete resolved JSON is byte-identical to the baseline`, async () => {
      const source = JSON.parse(
        readFileSync(`examples/${name}/map.json`, "utf8"),
      );
      const json = JSON.stringify(await layout(source, engine));
      expect(createHash("sha256").update(json).digest("hex")).toBe(
        hashes[`${name} ${id}`],
      );
    });
