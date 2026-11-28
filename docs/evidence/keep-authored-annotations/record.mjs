import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const [beforeFile, afterFile, beforeDir, afterDir, output] =
  process.argv.slice(2);
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
function save(path, value) {
  const target = join(output, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(value, null, 2) + "\n");
}
function contacts(report) {
  return ["labels", "steps"].flatMap((group) =>
    Object.entries(report[group]).flatMap(([kind, values]) =>
      values.map(({ a, b, band }) => JSON.stringify([group, kind, a, b, band])),
    ),
  );
}
function compareReports(before, after) {
  const old = new Set(contacts(before));
  const added = contacts(after).filter((contact) => !old.has(contact));
  assert.ok(after.hard <= before.hard, "hard defects increased");
  assert.deepEqual(added, [], "new tight or defect contacts");
  return { beforeHard: before.hard, afterHard: after.hard, newContacts: added };
}
const before = read(beforeFile),
  after = read(afterFile);
assert.equal(after.summary.clearMoved, 0);
assert.equal(after.results.length, 23);
assert.deepEqual(after.examples, before.examples, "server examples changed");
for (const map of after.results) {
  const old = before.results.find(({ id }) => id === map.id);
  assert.ok(old && map.hard <= old.hard);
  assert.ok(map.moved.every(({ contacts }) => contacts.length > 0));
  save(`book/${map.id}.json`, { ...map, beforeHard: old.hard });
}
for (const example of after.examples) {
  const old = before.examples.find(
    ({ name, engine }) => name === example.name && engine === example.engine,
  );
  save(`server/${example.name}-${example.engine}.json`, {
    name: example.name,
    engine: example.engine,
    beforeSha256: hash(old.map),
    afterSha256: hash(example.map),
    identical: true,
  });
}
const files = readdirSync(beforeDir)
  .filter((name) => name.endsWith(".json"))
  .sort();
assert.equal(files.length, 96);
assert.deepEqual(
  readdirSync(afterDir)
    .filter((name) => name.endsWith(".json"))
    .sort(),
  files,
);
let changed = 0;
for (const file of files) {
  const old = read(join(beforeDir, file)),
    next = read(join(afterDir, file));
  const identical = hash(old) === hash(next);
  if (!identical) changed++;
  const browser = file.split("-")[0];
  save(`browser/${browser}/${file.slice(browser.length + 1)}`, {
    viewport: next.viewport,
    raw: compareReports(old.report, next.report),
    presented: compareReports(old.presentationReport, next.presentationReport),
    beforePresentation: old.presentation,
    afterPresentation: next.presentation,
    beforeMoved: old.moved,
    afterMoved: next.moved,
    nowKept: old.moved.filter((id) => !next.moved.includes(id)),
    beforeSha256: hash(old),
    afterSha256: hash(next),
    identical,
  });
}
save("summary.json", {
  baselineCommit: "b50565a",
  implementationCommit: "23684fe",
  before: before.summary,
  after: after.summary,
  identicalServerExamples: after.examples.length,
  browserReports: files.length,
  changedBrowserReports: changed,
  hardRegressions: 0,
  newContacts: 0,
});
