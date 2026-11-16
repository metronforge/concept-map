import { expect, test } from "vitest";
import { ESLint } from "eslint";
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
    mkdirSync(join(dir, "src/layout/stages"), { recursive: true });
    writeFileSync(
      join(dir, "src/layout/stages/refine.ts"),
      "export const value = 1;",
    );
    writeFileSync(join(dir, "src/layout/index.ts"), "export const value = 1;");
    mkdirSync(join(dir, "src/element"), { recursive: true });
    for (const target of ["src/element.ts", "src/element/input.ts"])
      writeFileSync(
        join(dir, target),
        "export const value = 1; export interface Marker { id: string }",
      );
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
  ).toContain("player-only-pure-refinement");
});

for (const entry of ["../element.js", "../element/input.js"]) {
  test(`DOM cannot import element entry ${entry}`, () => {
    for (const source of [
      `export { value } from "${entry}";`,
      `export const load = () => import("${entry}");`,
      `export type { Marker } from "${entry}";`,
    ])
      expect(probe("src/dom/probe.ts", source)).toContain("dom-no-element");
  });
}
test("layout lint rejects class declarations and expressions", async () => {
  const eslint = new ESLint({ cwd: root });
  for (const source of [
    "export class Engine {}",
    "export const Engine = class {};",
  ]) {
    const [result] = await eslint.lintText(source, {
      filePath: "src/layout/probe.ts",
    });
    expect(
      result.messages.some((m) => m.message === "Core uses pure functions"),
    ).toBe(true);
  }
  const [result] = await eslint.lintText(
    "export function layout() { return {}; }",
    { filePath: "src/layout/probe.ts" },
  );
  expect(result.errorCount).toBe(0);
});

test("only the DOM refinement bridge may import the pure layout stage", () => {
  const source = 'export { value } from "../layout/stages/refine.js";';
  expect(probe("src/dom/refine.ts", source)).toEqual([]);
  expect(probe("src/model/probe.ts", source)).toContain(
    "player-only-pure-refinement",
  );
  expect(
    probe("src/dom/refine.ts", 'export { value } from "../layout/index.js";'),
  ).toContain("refinement-only-pure-stage");
});
