import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "rolldown";
import { chromium, firefox, webkit } from "playwright";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { assemble } from "./assemble.mjs";
import { routeChannel } from "./channel.mjs";
import { loadAvoid, routeAvoid } from "./avoid.mjs";
import { hash } from "./metrics.mjs";
import { report, evidence, bookReports } from "./browser-reports.mjs";

const [directory, ...flags] = process.argv.slice(2);
const mode = flags.includes("--check") ? "--check" : undefined;
const book = flags.includes("--book");
assert.ok(
  directory && flags.every((flag) => ["--check", "--book"].includes(flag)),
  "Usage: node experiments/routing/browser.mjs <output-directory> [--check] [--book]",
);
assert.equal(process.versions.node.split(".")[0], "26", "Use Node 26");
const allCases = await inputs();
const cases = allCases.filter((item) =>
  item.id.startsWith(book ? "book/" : "examples/"),
);
const avoid = await loadAvoid();
const candidates = cases.flatMap((item) => [
  { ...item, candidate: "current" },
  {
    ...item,
    candidate: "channel",
    resolved: assemble(item, routeChannel(prepare(item))),
  },
  {
    ...item,
    candidate: "libavoid",
    resolved: assemble(item, routeAvoid(avoid, prepare(item))),
  },
]);

async function assets() {
  const bundle = await build({
    input: "experiments/routing/browser-client.mjs",
    platform: "browser",
    output: { format: "esm", codeSplitting: false },
    write: false,
  });
  const css = readFileSync("css/concept-map.css", "utf8");
  return {
    "/client.js": ["text/javascript", bundle.output[0].code],
    "/sans.ttf": [
      "font/ttf",
      readFileSync("test/fixtures/fonts/DejaVuSans.ttf"),
    ],
    "/mono.ttf": [
      "font/ttf",
      readFileSync("test/fixtures/fonts/DejaVuSansMono.ttf"),
    ],
    "/": [
      "text/html",
      `<!doctype html><meta charset="utf-8"><style>
      @font-face{font-family:RoutingSans;src:url('/sans.ttf')}
      @font-face{font-family:RoutingMono;src:url('/mono.ttf')}
      ${css}
      body{font:16px RoutingSans;margin:16px}main{container-type:inline-size}
      .map-ui{--cmap-font-sans:RoutingSans;--cmap-font-mono:RoutingMono}
      </style>`,
    ],
  };
}

async function measure(page, item, name, version, width) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("http://routing.test/");
  const result = await page.evaluate(
    async (item) => (await import("/client.js")).measure(item),
    item,
  );
  const data = evidence(item, result, name, version, width, item.candidate);
  const path = `${name}/${item.candidate}/${item.id}/${width}`;
  if (book) {
    await bookReports(directory, mode, path, data, result.quality);
    return data;
  }
  const { labels, steps, ...quality } = result.quality;
  await report(directory, mode, `${path}/quality.json`, quality);
  for (const [group, lists] of Object.entries({ labels, steps }))
    for (const [kind, contacts] of Object.entries(lists))
      await report(directory, mode, `${path}/${group}-${kind}.json`, contacts);
  await report(directory, mode, `${path}/states.json`, data);
  return data;
}

async function probe(page, name) {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("http://routing.test/");
  const result = await page.evaluate(
    async (map) => (await import("/client.js")).probe(map),
    assemble(allCases[0], routeChannel(prepare(allCases[0]))),
  );
  assert.deepEqual(
    result,
    { mismatch: true, defect: true },
    `${name}: moved badge regression`,
  );
}

async function run(name, engine, files) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      reducedMotion: "reduce",
      colorScheme: "light",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("http://routing.test/**", (route) => {
      const file = files[new URL(route.request().url()).pathname];
      return file
        ? route.fulfill({ contentType: file[0], body: file[1] })
        : route.abort();
    });
    const reports = [];
    for (const width of [1280, 390])
      for (const item of candidates)
        reports.push(await measure(page, item, name, browser.version(), width));
    await probe(page, name);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    console.log(
      `${name}: ${reports.length} drawings, ${reports.reduce((n, r) => n + r.states.length, 0)} states, geometry preserved`,
    );
    return reports;
  } finally {
    await browser.close();
  }
}

const files = await assets();
const reports = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit }))
  reports.push(...(await run(name, engine, files)));
const summary = {
  node: process.version,
  lockSha256: hash(readFileSync("package-lock.json")),
  experimentLockSha256: hash(
    readFileSync("experiments/routing/package-lock.json"),
  ),
  sansSha256: hash(files["/sans.ttf"][1]),
  monoSha256: hash(files["/mono.ttf"][1]),
  drawings: reports.length,
  states: reports.reduce((n, r) => n + r.states.length, 0),
  candidates: Object.fromEntries(
    ["current", "channel", "libavoid"].map((candidate) => {
      const rows = reports.filter((r) => r.candidate === candidate);
      return [
        candidate,
        {
          drawings: rows.length,
          statesWithHardContacts: rows
            .flatMap((r) => r.states)
            .filter((s) => s.hard > 0).length,
          statesBelowPageText: rows.reduce(
            (n, r) => n + r.text.statesBelowPage,
            0,
          ),
          statesAboveTextLimit: rows.reduce(
            (n, r) => n + r.text.statesAboveLimit,
            0,
          ),
          drawingsWithOverflow: rows.filter((r) => r.maximumOverflow > 0)
            .length,
          drawingsNotFitting: rows.filter((r) => r.statesNotFitting > 0).length,
        },
      ];
    }),
  ),
};
await report(
  directory,
  mode,
  book ? "book-summary.json" : "summary.json",
  summary,
);
console.log(JSON.stringify(summary, null, 2));
