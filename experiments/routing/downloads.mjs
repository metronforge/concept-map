import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "rolldown";
import { hash } from "./metrics.mjs";

const root = "experiments/routing";
const [directory, mode] = process.argv.slice(2);
assert.ok(
  directory && (!mode || mode === "--check"),
  "Usage: node experiments/routing/downloads.mjs <output-directory> [--check]",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");

async function javascript(input, external = []) {
  const result = await build({
    input: join(root, input),
    platform: "browser",
    external,
    onLog(level, log, handler) {
      if (log.code === "UNRESOLVED_IMPORT") throw new Error(log.message);
      handler(level, log);
    },
    output: { minify: true, format: "esm", codeSplitting: false },
    write: false,
  });
  assert.equal(result.output.length, 1);
  const chunk = result.output[0];
  assert.equal(chunk.type, "chunk");
  assert.deepEqual(chunk.imports, external);
  assert.deepEqual(chunk.dynamicImports, []);
  return Buffer.from(chunk.code);
}

function bytes(name, buffer) {
  return {
    name,
    bytes: buffer.length,
    gzipBytes: gzipSync(buffer, { level: 9 }).length,
    sha256: hash(buffer),
  };
}

function report(candidate, assets) {
  const data = {
    candidate,
    node: process.version,
    rolldown: JSON.parse(readFileSync("node_modules/rolldown/package.json"))
      .version,
    gzipLevel: 9,
    assets: Object.entries(assets).map(([name, buffer]) => bytes(name, buffer)),
  };
  data.totalBytes = data.assets.reduce((n, a) => n + a.bytes, 0);
  data.totalGzipBytes = data.assets.reduce((n, a) => n + a.gzipBytes, 0);
  const folder = join(directory, "download");
  const path = join(folder, `${candidate}.json`);
  if (mode === "--check")
    assert.deepEqual(JSON.parse(readFileSync(path)), data);
  else {
    mkdirSync(folder, { recursive: true });
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
    const bundle = join(directory, "bundles", candidate);
    mkdirSync(bundle, { recursive: true });
    for (const [name, buffer] of Object.entries(assets))
      writeFileSync(join(bundle, name), buffer);
  }
  console.log(JSON.stringify(data, null, 2));
}

report("channel", { "channel.js": await javascript("channel.mjs") });
report("libavoid", {
  "avoid.js": await javascript("avoid.mjs", ["libavoid-js"]),
  "libavoid.js": await javascript("node_modules/libavoid-js/dist/index.js"),
  "libavoid.wasm": readFileSync(
    join(root, "node_modules/libavoid-js/dist/libavoid.wasm"),
  ),
});
