import { readFileSync } from "node:fs";
import {
  renderSvg,
  derive,
  renderPanelParts,
  statusText,
  escapeHtml as esc,
} from "../../dist/index.js";
const names = { manual: "Hand layout", dagre: "dagre", elk: "ELK" };
const num = (value) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
export function graphSvg(map, markerId, standalone = false) {
  const frame = derive(map, { scenario: 0, step: 0, mode: "all" });
  for (const field of ["nodes", "edges", "lanes", "frames", "edgeLabels"])
    for (const [id, value] of Object.entries(frame[field])) {
      value.revealed = true;
      if ("current" in value) value.current = false;
      if (field === "nodes") value.label = map.nodes[id].label;
    }
  frame.badges = [];
  const svg = renderSvg(map, { frame, markerId });
  if (!standalone) return svg;
  const style =
    readFileSync("css/concept-map.css", "utf8") +
    "\n@font-face{font-family:ComparisonSans;src:url(../fonts/DejaVuSans.ttf)}@font-face{font-family:ComparisonMono;src:url(../fonts/DejaVuSansMono.ttf)}.map-ui{--cmap-font-sans:ComparisonSans;--cmap-font-mono:ComparisonMono}";
  return svg
    .replace(
      "<svg ",
      `<svg xmlns="http://www.w3.org/2000/svg" class="map-ui" width="${map.viewBox[0]}" height="${map.viewBox[1]}" `,
    )
    .replace("<defs>", `<style>${style}</style><defs>`);
}
function cells(entry, name, bundles) {
  const { metrics: m, timing: t } = entry.variants[name];
  return `<td>${m.crossings}</td><td>${m.bends}</td><td>${m.labelNodeOverlaps}</td><td>${m.labelLabelOverlaps}</td><td>${num(m.area)}<small>${num(m.width)} × ${num(m.height)}</small></td><td>${t ? `<span title="Range: ${num(t.min)}–${num(t.max)} ms">${num(t.median)} ms</span>` : "—"}</td>${bundles ? `<td>${name === "manual" ? "—" : `${num(bundles[name].gzip / 1024)} KiB`}</td>` : ""}`;
}
const metricHeads =
  "<th>Crossings</th><th>Bends</th><th>Labels / nodes</th><th>Labels / labels</th><th>Area, units²</th><th>Layout time</th>";
function playerColumn(entry, name, map) {
  const title = names[name],
    frame = derive(map, { scenario: 0, step: 0, mode: "step" });
  const panel = renderPanelParts(map, frame),
    m = entry.variants[name].metrics;
  return `<article class="variant" data-variant="${name}"><header><h3>${title}</h3><div><button type="button" data-zoom aria-pressed="false" aria-label="Native size: ${title}, ${entry.id}">1:1</button><a href="svg/${entry.id}-${name}.svg" target="_blank" rel="noopener">SVG ↗</a></div></header>
    <div class="player map-ui" data-player tabindex="0" aria-label="${title}: ${esc(map.title)}">
      <div class="player-controls"><label>Scenario <select data-scenario-select aria-label="Scenario: ${title}, ${entry.id}">${map.scenarios.map((s, i) => `<option value="${i}">${esc(s.label)}</option>`).join("")}</select></label><div class="seg" role="group" aria-label="View"><button type="button" data-mode="step" aria-pressed="true">By step</button><button type="button" data-mode="all" aria-pressed="false">Whole map</button></div></div>
      <div class="canvas map" tabindex="0" aria-label="${title}: scroll diagram" style="--native-width:${map.viewBox[0]}px;--native-height:${map.viewBox[1]}px">${renderSvg(map, { frame, markerId: `${entry.id}-${name}` })}</div>
      <p class="sr-only" role="status" data-map-status>${esc(statusText(frame))}</p>
      <div class="panel head" data-role="panel">${panel.head}</div>
      <details class="player-details"><summary>Details and call log</summary><div class="panel more" data-role="more">${panel.more}</div></details>
    </div><footer><span>${m.crossings} crossings · ${m.bends} bends</span><a href="data/${entry.id}-${name}.json">JSON</a></footer></article>`;
}
function mapSection(entry, variants) {
  return `<section class="comparison" id="map-${entry.id}" data-map="${entry.id}">
    <header class="map-heading"><div><span class="eyebrow">${entry.id === "coffee" ? "EXAMPLE" : `BOOK · ${entry.id}`}</span><h2>${esc(entry.title)}</h2></div><a href="#summary">↑ Metrics</a></header>
    ${entry.note ? `<p class="note">${esc(entry.note)}</p>` : ""}
    <div class="controls"><button type="button" data-all-columns="all">Whole map in all columns</button><button type="button" data-all-columns="step">By step in all columns</button><a href="data/${entry.id}-source.json">Source without coordinates ↗</a></div>
    <p class="player-status" aria-live="polite">Loading players…</p>
    <div class="triptych">${Object.keys(names)
      .map((name) => playerColumn(entry, name, variants[name]))
      .join("")}</div>
    <div class="table-wrap"><table class="local-metrics"><caption>Complete map; measurements do not change with the selected scenario or step</caption><thead><tr><th>Version</th>${metricHeads}</tr></thead><tbody>${Object.keys(
      names,
    )
      .map((name) => `<tr><th>${names[name]}</th>${cells(entry, name)}</tr>`)
      .join("")}</tbody></table></div>
  </section>`;
}
function document(report) {
  const version = `${report.revision.slice(0, 12)}-${Date.parse(report.generatedAt)}`;
  const html = `<!doctype html><html lang="en" data-build="${version}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Hand layout · dagre · ELK — compare and play</title><link rel="icon" href="data:,"><link rel="stylesheet" href="concept-map.css"><link rel="stylesheet" href="page.css"><script src="client.js" type="module"></script></head><body>
  <header class="hero"><span class="eyebrow">CONCEPT MAP · LAYOUT COMPARISON</span><h1>One map.<br>Three ways to place it.</h1><p class="lead">Play 23 book maps and a coffee-shop example using hand-drawn, dagre and ELK layouts. Choose a scenario in each column. Whole map plays its token animation; By step lets you inspect each step. The author has not chosen a default engine.</p><div class="hero-links"><a href="#map-coffee">Start with the coffee shop ↓</a><a href="#summary">Compare measurements ↓</a><a href="metrics.json">Measurements as JSON ↗</a></div><p class="provenance">${report.revision.slice(0, 12)}${report.dirty ? " · working copy" : ""} · ${esc(report.generatedAt)} · dagre ${report.versions.dagre} / ELK ${report.versions.elk}</p></header>
  <main><aside class="note">Map 2.1 omits the arrow to a frame, <code>timeout_outer</code>, in all three versions. The coffee shop has an independent hand layout and uses <code>direction: right</code>. The other sources use the default downward direction.</aside>
  <nav class="map-nav" aria-label="Maps">${report.maps.map((m) => `<a href="#map-${m.id}">${m.id === "coffee" ? "Coffee shop" : m.id}</a>`).join("")}</nav>
  <section id="method"><h2>How to compare</h2><div class="method-grid"><p><b>Same source.</b> Both engines receive the same map without coordinates, paths or label positions. The hand layout is kept separately. Each column runs the same MapPlayer and uses the same DejaVu fonts.</p><p><b>Scale and playback.</b> Each diagram fits its own viewBox into the same window; these previews do not share a physical scale. Use 1:1 for detail. Whole map starts the scenario's flow, if it has one. Replay restarts it. Reduced-motion preferences are respected.</p><p><b>Crossings and bends.</b> Count transverse crossings between different edges, excluding endpoints, touching and overlapping segments. Bends count changes of direction. Area is viewBox width × height, including padding.</p><p><b>Label overlaps.</b> Labels / nodes counts edge-label rectangles intersecting node boxes. Labels / labels counts overlapping pairs of edge labels. Boundary contact is excluded. Counts use the same font metrics and baseline as layout at native size; browser fitting and scenario visibility can change the visible result. Node titles inside their own boxes are not counted.</p><p><b>Timing.</b> Median of five complete layout() calls after one warm-up for each map and engine. Import, rendering and file writes are excluded. Hand-drawing time is unknown, not zero. Full samples and overlap pairs are in the JSON.</p><p><b>Look beyond the numbers.</b> Frames derived from visibility triggers may differ from hand-drawn groups. The measurements do not rate meaning or reading order. There is no combined score or automatic winner.</p></div>
  <details><summary>Environment and bundle sizes</summary><p>${esc(report.environment.node)} · ${esc(report.environment.platform)} ${esc(report.environment.arch)} · ${esc(report.environment.cpu ?? "")}. Runs are sequential; engine order alternates between maps.</p><p>The bundle includes layout(), its adapter, the engine and Zod, with no external dependencies. It is minified browser ESM compressed with gzip level 9. It excludes CSS, fonts, map data and MapPlayer. The page loads saved maps and MapPlayer; it does not load either layout engine.</p><p>dagre: ${num(report.bundles.dagre.gzip / 1024)} KiB gzip (${num(report.bundles.dagre.raw / 1024)} KiB raw). ELK: ${num(report.bundles.elk.gzip / 1024)} KiB gzip (${num(report.bundles.elk.raw / 1024)} KiB raw). Size is the same for every map; a dash means not applicable.</p></details></section>
  <section id="summary"><h2>All measurements</h2><div class="table-wrap"><table><caption>24 maps × 3 versions. KiB = 1024 bytes.</caption><thead><tr><th>Map</th><th>Version</th>${metricHeads}<th>Bundle + engine, gzip</th></tr></thead><tbody>${report.maps
    .map((m) =>
      Object.keys(names)
        .map(
          (name) =>
            `<tr><th><a href="#map-${m.id}">${m.id === "coffee" ? "Coffee shop" : m.id}</a></th><td>${names[name]}</td>${cells(m, name, report.bundles)}</tr>`,
        )
        .join(""),
    )
    .join("")}</tbody></table></div></section>
  ${report.maps.map((m) => m.html).join("\n")}</main><footer class="site-footer">The author decides. <a href="https://github.com/metronforge/concept-map/pull/16">Review the changes ↗</a> · <a href="fonts/LICENSE.txt">DejaVu license</a></footer></body></html>`;
  return html.replace(
    /(href|src)="((?:data|svg|fonts)\/[^"?]+|metrics\.json|client\.js|page\.css|concept-map\.css)"/g,
    (_, attribute, path) => `${attribute}="${path}?v=${version}"`,
  );
}
export const page = { mapSection, document };
