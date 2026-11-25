import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Build an isolated experiment; never replace the repository's public schemas.
const root = fileURLToPath(new URL("../", import.meta.url));
assert.ok(
  process.argv.slice(2).every((arg) => arg === "--bare"),
  "usage: node scripts/zod-mini-experiment.mjs [--bare]",
);
const destination = mkdtempSync(join(tmpdir(), "concept-map-zod-mini-"));
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root, encoding: "utf8" },
).split("\0");
for (const file of files.filter(Boolean)) {
  const target = join(destination, file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, file), target);
}
symlinkSync(
  join(root, "node_modules"),
  join(destination, "node_modules"),
  "dir",
);
const patches = [
  "schema.ts",
  "schema-primitives.ts",
  "schema-content.ts",
  "schema-hints.ts",
  "schema-measurement.ts",
  "schema-layout.ts",
  "test-format3",
];
if (!process.argv.includes("--bare")) patches.push("english");
for (const patch of patches) {
  execFileSync(
    "patch",
    [
      "--batch",
      "--forward",
      "--fuzz=0",
      "-p1",
      "-i",
      join(root, "docs/evidence/zod-mini/patches", `${patch}.patch`),
    ],
    { cwd: destination, stdio: ["ignore", "ignore", "inherit"] },
  );
}
console.log(destination);
