import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const run = (...args) =>
  spawnSync(process.execPath, ["experiments/routing/overlaps.mjs", ...args], {
    encoding: "utf8",
  });

test("overlap reports reproduce and reject altered spans without repairing them", () => {
  const directory = mkdtempSync(join(tmpdir(), "routing-overlap-"));
  try {
    const written = run(directory);
    assert.equal(written.status, 0, written.stderr);
    const path = join(directory, "overlap/channel/book/hand/2-1/pairs/0.json");
    const before = readFileSync(path, "utf8");
    const checked = run(directory, "--check");
    assert.equal(checked.status, 0, checked.stderr);
    assert.equal(readFileSync(path, "utf8"), before);
    const data = JSON.parse(before);
    data.spans[0].end += 1;
    const altered = JSON.stringify(data);
    writeFileSync(path, altered);
    const rejected = run(directory, "--check");
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /2-1/);
    assert.equal(readFileSync(path, "utf8"), altered);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
