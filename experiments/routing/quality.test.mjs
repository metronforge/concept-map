import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const run = (...args) =>
  spawnSync(process.execPath, ["experiments/routing/quality.mjs", ...args], {
    encoding: "utf8",
  });

test("quality evidence round-trips signed zero without rewriting reports", () => {
  const directory = "docs/evidence/routing-experiment";
  const path = join(directory, "quality/channel/book/hand/4-1.json");
  const before = readFileSync(path, "utf8");
  const result = run(directory, "--check");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(path, "utf8"), before);
});

test("quality check rejects changed measurements without repairing evidence", () => {
  const directory = mkdtempSync(join(tmpdir(), "routing-quality-"));
  try {
    const written = run(directory);
    assert.equal(written.status, 0, written.stderr);
    const path = join(directory, "quality/channel/examples/dagre/coffee.json");
    const data = JSON.parse(readFileSync(path, "utf8"));
    data.quality.hard += 1;
    const altered = JSON.stringify(data);
    writeFileSync(path, altered);
    const checked = run(directory, "--check");
    assert.notEqual(checked.status, 0);
    assert.match(checked.stderr, /coffee/);
    assert.equal(readFileSync(path, "utf8"), altered);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
