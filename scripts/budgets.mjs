import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import ts from "typescript";
import assert from "node:assert/strict";
const files = (p) =>
  readdirSync(p, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(p + "/" + e.name)
      : e.name.endsWith(".ts")
        ? [p + "/" + e.name]
        : [],
  );
const violations = {};
for (const file of files("src")) {
  const text = readFileSync(file, "utf8"),
    lines = text.trimEnd().split("\n").length;
  if (lines > 200) violations[file] = lines;
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isFunctionLike(node) && node.body) {
      const start = ast.getLineAndCharacterOfPosition(node.getStart()).line,
        end = ast.getLineAndCharacterOfPosition(node.end).line;
      const count = end - start + 1;
      if (count > 40)
        violations[
          `${file}:${node.name?.getText(ast) ?? "function@" + (start + 1)}`
        ] = count;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
const path = "docs/complexity-exceptions.json";
if (process.argv.includes("--record"))
  writeFileSync(path, JSON.stringify(violations, null, 2) + "\n");
else {
  const allowed = JSON.parse(readFileSync(path, "utf8"));
  for (const [key, count] of Object.entries(violations))
    assert.ok(
      allowed[key] >= count,
      `${key}: ${count} lines exceeds documented baseline ${allowed[key] ?? "none"}`,
    );
  console.log("Complexity budgets pass with exact stage-A legacy exceptions");
}
