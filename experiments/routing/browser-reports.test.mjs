import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { report, summarize } from "./browser-reports.mjs";

test("browser evidence rejects changed measurements without rewriting them", async () => {
  const directory = mkdtempSync(join(tmpdir(), "routing-browser-"));
  try {
    const data = { hard: 1, contact: { gap: -0 } };
    await report(directory, undefined, "sample.json", data);
    await report(directory, "--check", "sample.json", data);
    const file = join(directory, "browser/sample.json");
    const altered = JSON.stringify({ ...data, hard: 0 });
    writeFileSync(file, altered);
    await assert.rejects(report(directory, "--check", "sample.json", data));
    assert.equal(readFileSync(file, "utf8"), altered);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("browser summaries keep contact defects and small text as separate failures", () => {
  const contact = { a: "label:a", b: "step:b", band: "defect", gap: -1 };
  const state = {
    scenario: "normal",
    step: "all",
    presentation: "drawing",
    hard: 1,
    contacts: { labels: [contact] },
    text: {
      pageFont: 16,
      minimum: 10,
      maximum: 19,
      belowPage: 2,
      aboveLimit: 0,
      overflow: 0,
      fits: true,
    },
  };
  const summary = summarize([state, state]);
  assert.deepEqual(
    summary.states.map((s) => s.hard),
    [1, 1],
  );
  assert.deepEqual(summary.defects, ["label:a / step:b"]);
  assert.equal(summary.text.statesBelowPage, 2);
  assert.equal(summary.text.minimum, 10);
  assert.equal(summary.maximumOverflow, 0);
  assert.equal(summary.statesNotFitting, 0);
});
