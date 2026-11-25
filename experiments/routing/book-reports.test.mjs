import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import * as reports from "./browser-reports.mjs";

test("partitioned browser evidence retains every item and rejects altered parts", async () => {
  assert.equal(typeof reports.reportParts, "function");
  const directory = mkdtempSync(join(tmpdir(), "routing-book-"));
  const data = Array.from({ length: 51 }, (_, i) => ({ step: i, hard: i % 2 }));
  try {
    const files = await reports.reportParts(
      directory,
      undefined,
      "states",
      data,
    );
    const read = (file) =>
      JSON.parse(readFileSync(join(directory, "browser", file), "utf8"));
    assert.deepEqual(files.flatMap(read), data);
    for (const file of files)
      assert.ok(
        readFileSync(join(directory, "browser", file), "utf8")
          .trimEnd()
          .split("\n").length <= 200,
      );
    assert.deepEqual(
      await reports.reportParts(directory, "--check", "states", data),
      files,
    );
    const file = join(directory, "browser", files.at(-1));
    writeFileSync(file, "[]\n");
    await assert.rejects(
      reports.reportParts(directory, "--check", "states", data),
    );
    assert.equal(readFileSync(file, "utf8"), "[]\n");
    assert.deepEqual(
      await reports.reportParts(directory, undefined, "empty", []),
      [],
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

const contactGroups = {
  labels: ["lines", "boxes", "labels"],
  steps: ["labels", "boxes", "steps"],
  lines: ["boxes"],
};

test("book reports preserve states, defects and every raw contact group", async () => {
  const directory = mkdtempSync(join(tmpdir(), "routing-book-"));
  const contact = { a: "label:a", b: "step:b", gap: -1, band: "defect" };
  const data = {
    id: "book/hand/test",
    states: [{ step: "all", hard: 1 }],
    defects: ["label:a / step:b"],
  };
  const quality = {
    hard: 1,
    labels: { lines: [contact], boxes: [], labels: [] },
    steps: { labels: [contact], boxes: [], steps: [] },
    lines: { boxes: [contact] },
    crossings: { count: 0, pairs: [] },
  };
  try {
    await reports.bookReports(directory, undefined, "sample", data, quality);
    const read = (file) =>
      JSON.parse(readFileSync(join(directory, "browser", file), "utf8"));
    const summary = read("sample/summary.json");
    assert.equal(summary.id, data.id);
    assert.equal(summary.stateCount, 1);
    assert.deepEqual(summary.parts.states.flatMap(read), data.states);
    assert.deepEqual(summary.parts.defects.flatMap(read), data.defects);
    const reconstructed = read("sample/quality.json");
    for (const [group, kinds] of Object.entries(contactGroups))
      reconstructed[group] = Object.fromEntries(
        kinds.map((kind) => [
          kind,
          summary.parts[`${group}-${kind}`].flatMap(read),
        ]),
      );
    assert.deepEqual(reconstructed, quality);
    await reports.bookReports(directory, "--check", "sample", data, quality);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
