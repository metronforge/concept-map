import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { build } from "vite";
import {
  renderSvg,
  renderPanelParts,
  renderConcepts,
  derive,
  initialState,
  statusText,
  escapeHtml as esc,
} from "../dist/index.js";
const maps = JSON.parse(readFileSync("test/fixtures/book-maps.json", "utf8"));
const pages = JSON.parse(readFileSync("test/fixtures/pages.json", "utf8"));
rmSync(".demo", { recursive: true, force: true });
mkdirSync(".demo");
copyFileSync("demo/MapFigure.js", ".demo/MapFigure.js");
const inputs = [];
for (const { id, map } of maps) {
  const entry = pages.find((p) => p.id === id),
    path = ".demo" + entry.path + "index.html";
  mkdirSync(resolve(path, ".."), { recursive: true });
  const f = derive(map, initialState),
    panel = renderPanelParts(map, f);
  const html = `<!doctype html><html lang="en"><meta charset="UTF-8"><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width"><title>${esc(map.title)}</title><style>body{font:16px system-ui;margin:16px}main{container-type:inline-size}.map-ui{--cmap-border:#bbb;--cmap-muted-fg:#666}.map-concepts{margin-top:24px}.map-ui .cgroup{max-width:100%}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}</style><main><h1>${esc(map.title)}</h1><figure class="map-figure map-ui" id="${entry.figureId}" data-figure="map" tabindex="0" aria-label="${esc(map.title)}"><section aria-label="Concept map"><div class="bar"><div class="seg scenarios" role="group" aria-label="Scenario" data-role="scenarios">${map.scenarios.map((s, i) => `<button type="button" data-scenario="${s.id}" aria-pressed="${i === 0}">${esc(s.label)}</button>`).join("")}</div><div class="seg" role="group" aria-label="View"><button type="button" data-mode="step" aria-pressed="true">Step by step</button><button type="button" data-mode="all" aria-pressed="false">Whole map</button></div></div><div class="map">${renderSvg(map, { frame: f, markerId: entry.figureId + "-arrow" })}</div></section><p class="sr-only" role="status" data-map-status>${esc(statusText(f))}</p><div class="panel head" data-role="panel">${panel.head}</div><div class="panel more" data-role="more">${panel.more}</div><script type="application/json" data-map-data>${JSON.stringify(map).replaceAll("<", "\\u003c")}</script></figure><div class="map-ui map-concepts" data-map-concepts="${entry.figureId}">${renderConcepts(map)}</div></main><script type="module" src="/MapFigure.js"></script></html>`;
  writeFileSync(path, html);
  inputs.push(resolve(path));
}
writeFileSync(
  ".demo/index.html",
  '<!doctype html><link rel="icon" href="data:,"><title>Concept map demo</title><h1>Concept maps</h1>' +
    pages.map((p) => `<p><a href="${p.path}">${p.id}</a></p>`).join(""),
);
inputs.push(resolve(".demo/index.html"), resolve(".demo/MapFigure.js"));
await build({
  configFile: false,
  root: ".demo",
  build: {
    outDir: "../demo-dist",
    emptyOutDir: true,
    rolldownOptions: {
      preserveEntrySignatures: "strict",
      input: {
        ...Object.fromEntries(
          inputs
            .filter((p) => p.endsWith(".html"))
            .map((p, i) => ["page" + i, p]),
        ),
        player: resolve(".demo/MapFigure.js"),
      },
      output: { entryFileNames: "assets/[name].js" },
    },
  },
});
