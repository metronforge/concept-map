import { expect, test } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root = resolve(".");
function probe(file: string, source: string) {
  const dir = mkdtempSync(join(tmpdir(), "concept-map-guard-"));
  try {
    mkdirSync(join(dir, "src/model"), { recursive: true });
    symlinkSync(join(root, "node_modules"), join(dir, "node_modules"), "dir");
    writeFileSync(
      join(dir, "tsconfig.json"),
      readFileSync(join(root, "tsconfig.json")),
    );
    writeFileSync(join(dir, "package.json"), '{"type":"module"}');
    writeFileSync(join(dir, file), source);
    const result = spawnSync(
      process.execPath,
      [
        join(
          root,
          "node_modules/dependency-cruiser/bin/dependency-cruiser.mjs",
        ),
        "src",
        "--config",
        join(root, ".dependency-cruiser.cjs"),
        "--output-type",
        "json",
      ],
      { cwd: dir, encoding: "utf8" },
    );
    if (result.error) throw result.error;
    if (!result.stdout) throw new Error(result.stderr);
    const output = JSON.parse(result.stdout);
    return output.summary.violations.map(
      (v: { rule: { name: string } }) => v.rule.name,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
test("dependency guard rejects external runtime import through the public barrel", () => {
  expect(probe("src/index.ts", 'export { z } from "zod";')).toContain(
    "no-external-runtime-outside-schema",
  );
});
test("dependency guard rejects bare Node builtins in the model", () => {
  expect(
    probe(
      "src/model/probe.ts",
      'import { readFileSync } from "fs"; export const value = readFileSync("x");',
    ),
  ).toContain("no-external-runtime-outside-schema");
});
test("dependency guard permits schema-owned Zod import", () => {
  expect(
    probe(
      "src/schema.ts",
      'import { z } from "zod"; export const value = z.string();',
    ),
  ).toEqual([]);
});
