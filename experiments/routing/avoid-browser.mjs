import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium, firefox, webkit } from "playwright";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { loadAvoid, routeAvoid } from "./avoid.mjs";
import { routeIssues } from "./route-audit.mjs";

assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");
const root = new URL("./", import.meta.url);
const assets = {
  "/avoid.mjs": ["text/javascript", readFileSync(new URL("avoid.mjs", root))],
  "/index.js": [
    "text/javascript",
    readFileSync(new URL("node_modules/libavoid-js/dist/index.js", root)),
  ],
  "/libavoid.wasm": [
    "application/wasm",
    readFileSync(new URL("node_modules/libavoid-js/dist/libavoid.wasm", root)),
  ],
  "/": [
    "text/html",
    '<script type="importmap">{"imports":{"libavoid-js":"/index.js"}}</script>',
  ],
};
const problems = (await inputs()).map(prepare);
const avoid = await loadAvoid();
const expected = problems.map((p) => routeAvoid(avoid, p));

async function verify(name, engine) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    const requested = new Set();
    await page.route("http://routing.test/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      const asset = assets[path];
      requested.add(path);
      return asset
        ? route.fulfill({ contentType: asset[0], body: asset[1] })
        : route.abort();
    });
    await page.goto("http://routing.test/");
    const actual = await page.evaluate(async (cases) => {
      const { loadAvoid, routeAvoid } = await import("/avoid.mjs");
      const module = await loadAvoid();
      return cases.map((problem) => routeAvoid(module, problem));
    }, problems);
    assert.ok(
      requested.has("/libavoid.wasm"),
      `${name}: separate WASM request`,
    );
    assert.deepEqual(actual, expected, `${name}: Node/browser route parity`);
    actual.forEach((routes, i) =>
      routes.forEach((r, j) => {
        assert.equal(r.failure, undefined);
        assert.deepEqual(routeIssues(problems[i], problems[i].edges[j], r), []);
      }),
    );
    console.log(
      `${name}: 29 maps, 260 edges, separate WASM, exact Node parity`,
    );
  } finally {
    await browser.close();
  }
}

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }))
  await verify(name, engine);
