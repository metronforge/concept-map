import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { layout } from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
import hashes from "./example-hashes.json";

// Fixed geometry captured before shared number placement.
for (const name of ["coffee", "door", "gcd"] as const)
  for (const [id, engine] of [
    ["dagre", dagreEngine],
    ["elk", elkEngine],
  ] as const)
    test(`${name} ${id}: node boxes, lanes, frames and view box are byte-identical to the baseline`, async () => {
      const source = JSON.parse(
        readFileSync(`examples/${name}/map.json`, "utf8"),
      );
      const { measurement, nodes, lanes, frames, viewBox } = await layout(
        source,
        engine,
      );
      expect(measurement?.name).toBe("font-table");
      const json = JSON.stringify({ nodes, lanes, frames, viewBox });
      expect(createHash("sha256").update(json).digest("hex")).toBe(
        hashes[`${name} ${id}`],
      );
    });
