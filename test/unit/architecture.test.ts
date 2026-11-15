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
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root = resolve(".");
function probe(file: string, source: string) {
  const dir = mkdtempSync(join(tmpdir(), "concept-map-guard-"));
  try {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    mkdirSync(join(dir, "src/layout"), { recursive: true });
    writeFileSync(join(dir, "src/layout/index.ts"), "export const value = 1;");
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

test("element loader permits dynamic imports but rejects static layout imports", () => {
  expect(
    probe(
      "src/element/layout.ts",
      'export const load = () => import("../layout/index.js");',
    ),
  ).toEqual([]);
  expect(
    probe(
      "src/element/layout.ts",
      'import { value } from "../layout/index.js"; export { value };',
    ),
  ).toContain("element-layout-imports-are-dynamic");
  expect(
    probe(
      "src/dom/probe.ts",
      'export const load = () => import("../layout/index.js");',
    ),
  ).toContain("player-no-layout-runtime");
});
