import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeChannel } from "./channel.mjs";
import { loadAvoid, routeAvoid } from "./avoid.mjs";
import { hash } from "./metrics.mjs";

const [directory, extra] = process.argv.slice(2);
assert.ok(
  directory && !extra,
  "Usage: node experiments/routing/download-browser.mjs <output-directory>",
);
const problems = (await inputs()).map(prepare);
const avoid = await loadAvoid();
const expected = {
  channel: problems.map(routeChannel),
  libavoid: problems.map((p) => routeAvoid(avoid, p)),
};

function assets() {
  const files = {
    "/": [
      "text/html",
      '<script type="importmap">{"imports":{"libavoid-js":"/libavoid/libavoid.js"}}</script>',
    ],
  };
  for (const candidate of ["channel", "libavoid"]) {
    const report = JSON.parse(
      readFileSync(join(directory, "download", `${candidate}.json`)),
    );
    for (const asset of report.assets) {
      const data = readFileSync(
        join(directory, "bundles", candidate, asset.name),
      );
      assert.equal(hash(data), asset.sha256);
      files[`/${candidate}/${asset.name}`] = [
        asset.name.endsWith("wasm") ? "application/wasm" : "text/javascript",
        data,
      ];
    }
  }
  return files;
}

async function evaluate(page) {
  return page.evaluate(async (cases) => {
    const { routeChannel } = await import("/channel/channel.js");
    const { loadAvoid, routeAvoid } = await import("/libavoid/avoid.js");
    const module = await loadAvoid();
    return {
      channel: cases.map(routeChannel),
      libavoid: cases.map((p) => routeAvoid(module, p)),
    };
  }, problems);
}

async function verify(name, engine, files) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    const requested = new Set();
    await page.route("http://routing.test/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      requested.add(path);
      const asset = files[path];
      return asset
        ? route.fulfill({ contentType: asset[0], body: asset[1] })
        : route.abort();
    });
    await page.goto("http://routing.test/");
    assert.deepEqual(
      await evaluate(page),
      expected,
      `${name}: minified route parity`,
    );
    assert.deepEqual([...requested].sort(), Object.keys(files).sort());
    console.log(
      `${name}: both measured downloads match all 260 Node routes; separate library and WASM requests`,
    );
  } finally {
    await browser.close();
  }
}

const files = assets();
for (const [name, engine] of Object.entries({ chromium, firefox, webkit }))
  await verify(name, engine, files);
