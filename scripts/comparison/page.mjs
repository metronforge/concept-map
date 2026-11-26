import { readFileSync } from "node:fs";
import {
  renderSvg,
  derive,
  renderPanelParts,
  statusText,
  escapeHtml as esc,
} from "../../dist/index.js";
import { variants as definitions } from "./variants.mjs";
const variantNames = (entry) =>
  Object.keys(definitions).filter((name) => name in entry.variants);
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
      /^<svg width="[^"]*" /,
      `<svg xmlns="http://www.w3.org/2000/svg" class="map-ui" width="${map.viewBox[0]}" height="${map.viewBox[1]}" `,
    )
    .replace("<defs>", `<style>${style}</style><defs>`);
}
const percent = (share) =>
  share === null ? "—" : `${Math.round(share * 100)}%`;
const backwardReturns = (returns) =>
  returns.edges ? `${returns.backward} of ${returns.edges}` : "—";
function cells(entry, name, bundles) {
  const { metrics: m, timing: t } = entry.variants[name];
  const reading = m.quality.reading;
  return `<td>${m.hard}</td><td>${m.crossings}</td><td>${m.bends}</td><td>${percent(reading.nonReturn.share)}</td><td>${backwardReturns(reading.returns)}</td><td>${reading.returns.selfLoops}</td><td>${num(m.area)}<small>${num(m.width)} × ${num(m.height)}</small></td><td>${t ? `<span title="Range: ${num(t.min)}–${num(t.max)} ms">${num(t.median)} ms</span>` : "—"}</td>${bundles ? `<td>${name === "manual" ? "—" : `${num(bundles[definitions[name].engine].gzip / 1024)} KiB`}</td>` : ""}`;
}
const metricHeads =
  "<th>Hard defects</th><th>Crossings</th><th>Bends</th><th>Non-return reading</th><th>Returns drawn backward</th><th>Self-loops</th><th>Area, units²</th><th>Layout time</th>";
function playerColumn(entry, name, map) {
  const title = definitions[name].title,
    frame = derive(map, { scenario: 0, step: 0, mode: "step" });
  const panel = renderPanelParts(map, frame),
    m = entry.variants[name].metrics,
    reading = m.quality.reading;
  return `<article class="variant" data-variant="${name}"><header><h3>${title}</h3><div><button type="button" data-zoom aria-pressed="false" aria-label="Native size: ${title}, ${entry.id}">1:1</button><a href="svg/${entry.id}-${name}.svg" target="_blank" rel="noopener">SVG ↗</a></div></header>
    <div class="player map-ui" data-player tabindex="0" aria-label="${title}: ${esc(map.title)}">
      <div class="player-controls"><label>Scenario <select data-scenario-select aria-label="Scenario: ${title}, ${entry.id}">${map.scenarios.map((s, i) => `<option value="${i}">${esc(s.label)}</option>`).join("")}</select></label><div class="seg" role="group" aria-label="View"><button type="button" data-mode="step" aria-pressed="true">By step</button><button type="button" data-mode="all" aria-pressed="false">Whole map</button></div></div>
      <div class="canvas map" tabindex="0" aria-label="${title}: scroll diagram" style="--native-width:${map.viewBox[0]}px;--native-height:${map.viewBox[1]}px">${renderSvg(map, { frame, markerId: `${entry.id}-${name}` })}</div>
      <p class="sr-only" role="status" data-map-status>${esc(statusText(frame))}</p>
      <div class="panel head" data-role="panel">${panel.head}</div>
      <details class="player-details"><summary>Details and call log</summary><div class="panel more" data-role="more">${panel.more}</div></details>
    </div><footer><span>${m.hard} hard defects · ${m.crossings} crossings · ${m.bends} bends · non-return reading ${percent(reading.nonReturn.share)} · returns drawn backward ${backwardReturns(reading.returns)} · self-loops ${reading.returns.selfLoops}</span><a href="data/${entry.id}-${name}.json">JSON</a></footer><details class="quality-report"><summary>Server check() report</summary><p>Complete saved geometry, measured with font tables. The player may refine labels or move them to its panel at this width.</p><pre>${esc(JSON.stringify(m.quality, null, 2))}</pre></details></article>`;
}
function mapSection(entry, variants) {
  return `<section class="comparison" id="map-${entry.id}" data-map="${entry.id}">
    <header class="map-heading"><div><span class="eyebrow">${!variants.manual ? "EXAMPLE" : `REFERENCE · ${entry.id}`}</span><h2>${esc(entry.title)}</h2></div><a href="#summary">↑ Metrics</a></header>
    ${entry.note ? `<p class="note">${esc(entry.note)}</p>` : ""}
    <div class="controls"><button type="button" data-all-columns="all">Whole map in all columns</button><button type="button" data-all-columns="step">By step in all columns</button><a href="data/${entry.id}-source.json">Source without coordinates ↗</a></div>
    <p class="player-status" aria-live="polite">Loading players…</p>
    <div class="variants">${variantNames(entry)
      .map((name) => playerColumn(entry, name, variants[name]))
      .join("")}</div>
    <div class="table-wrap"><table class="local-metrics"><caption>Server measurements; reading and returns use the first scenario and do not change with playback</caption><thead><tr><th>Version</th>${metricHeads}</tr></thead><tbody>${variantNames(
      entry,
    )
      .map(
        (name) =>
          `<tr><th>${definitions[name].title}</th>${cells(entry, name)}</tr>`,
      )
      .join("")}</tbody></table></div>
  </section>`;
}
function document(report) {
  const version = `${report.revision.slice(0, 12)}-${Date.parse(report.generatedAt)}`;
  const html = `<!doctype html><html lang="en" data-build="${version}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Hand layout · dagre · ELK — compare and play</title><link rel="icon" href="data:,"><link rel="stylesheet" href="concept-map.css"><link rel="stylesheet" href="page.css"><link rel="stylesheet" href="same-rank.css"><script src="client.js" type="module"></script></head><body>
  <header class="hero"><span class="eyebrow">CONCEPT MAP · LAYOUT COMPARISON</span><h1>One map.<br>With and without scenario intent.</h1><p class="lead">Compare the coffee, door, gcd, side-hints, free and same-rank examples, 23 book maps and the original coffee reference. Each engine runs with and without preferences derived from the first scenario. Hand drawings are kept unchanged; intent has no effect on them. Choose a scenario in each column. Whole map plays its token animation; By step lets you inspect each step. Dagre is the chosen default; both engines remain available.</p><div class="hero-links"><a href="examples/coffee/">Try the standalone coffee shop ↗</a><a href="#map-coffee">Compare the coffee shop ↓</a><a href="#map-free">Compare review feedback ↓</a><a href="#map-same-rank">Compare aligned outcomes ↓</a><a href="#summary">Compare measurements ↓</a><a href="metrics.json">Measurements as JSON ↗</a></div><p class="provenance">${report.revision.slice(0, 12)}${report.dirty ? " · working copy" : ""} · ${esc(report.generatedAt)} · dagre ${report.versions.dagre} / ELK ${report.versions.elk}</p></header>
  <main><aside class="note">Map 2.1 omits the arrow to a frame, <code>timeout_outer</code>, in every variant. The original coffee reference has an independent hand layout. The six current examples use their exact source maps and have no hand references. Separate free and same-rank sections remove only their stated hints. Stated side hints remain active in both ELK columns; plain disables only derived scenario intent.</aside>
  <nav class="map-nav" aria-label="Maps">${report.maps.map((m) => `<a href="#map-${m.id}">${m.id === "coffee" ? "Coffee shop" : m.id}</a>`).join("")}</nav>
  <section id="method"><h2>How to compare</h2><div class="method-grid"><p><b>Same source.</b> Both engines receive the same map without coordinates, paths or label positions. With intent is the layout() default; without intent passes { intent: false }. Adapter support determines which preferences take effect; identical columns mean the drawing did not change. The hand layout is kept separately. Each column runs the same MapPlayer and uses the same DejaVu fonts.</p><p><b>Scale and playback.</b> Each diagram fits its own viewBox into the same window; these previews do not share a physical scale. Use 1:1 for detail. Whole map starts the scenario's flow, if it has one. Replay restarts it. Reduced-motion preferences are respected.</p><p><b>Crossings and bends.</b> Count transverse crossings between different edges, excluding endpoints, touching and overlapping segments. Bends count changes of direction. Area is viewBox width × height, including padding.</p><p><b>Hard defects.</b> The library's own check: an arrow label crossed by a line, covered by a box or another label; a step number over a label, a box or another number; a line over a box it does not connect. Each contact is clear, tight or a defect, with thresholds relative to the label text size, so browsers that differ by a fraction of a pixel agree. It judges the complete map with every scenario's labels and numbers at once. Font tables estimate the text, as in layout. The full report, including tight contacts, is in the JSON.</p><p><b>Reading direction.</b> Share of the first scenario's non-return traversals that follow the map's direction (down, or right). Return arrows connect back to a node at or before their source in first-visit order. They are counted separately: how many travel backward out of all non-self returns. A same-rank return is not backward. Self-loops have their own count. Each edge and travel direction counts once; reverse traversal follows the scenario. A dash means there are no eligible traversals. The JSON also keeps the original all-arrow reading share.</p><p><b>Timing.</b> Median of five complete layout() calls after one warm-up for each map, engine and intent setting. Import, rendering and file writes are excluded. Hand-drawing time is unknown, not zero. Full samples and overlap pairs are in the JSON.</p><p><b>Look beyond the numbers.</b> Frames derived from visibility triggers may differ from hand-drawn groups. Reading direction does not rate meaning or the overall clarity of a drawing. There is no combined score or automatic winner.</p></div>
  <details><summary>Environment and bundle sizes</summary><p>${esc(report.environment.node)} · ${esc(report.environment.platform)} ${esc(report.environment.arch)} · ${esc(report.environment.cpu ?? "")}. Runs are sequential; engine order alternates between maps.</p><p>The bundle includes layout(), its adapter, the engine and Zod, with no external dependencies. It is minified browser ESM compressed with gzip level 9. It excludes CSS, fonts, map data and MapPlayer. The page loads saved maps and MapPlayer; it does not load either layout engine.</p><p>dagre: ${num(report.bundles.dagre.gzip / 1024)} KiB gzip (${num(report.bundles.dagre.raw / 1024)} KiB raw). ELK: ${num(report.bundles.elk.gzip / 1024)} KiB gzip (${num(report.bundles.elk.raw / 1024)} KiB raw). Size is the same for every map; a dash means not applicable.</p></details></section>
  <section id="summary"><h2>All measurements</h2><div class="table-wrap"><table><caption>${report.maps.length} maps; with and without intent for each engine, plus hand references where available. KiB = 1024 bytes.</caption><thead><tr><th>Map</th><th>Version</th>${metricHeads}<th>Bundle + engine, gzip</th></tr></thead><tbody>${report.maps
    .map((m) =>
      variantNames(m)
        .map(
          (name) =>
            `<tr><th><a href="#map-${m.id}">${m.id === "coffee" ? "Coffee shop" : m.id}</a></th><td>${definitions[name].title}</td>${cells(m, name, report.bundles)}</tr>`,
        )
        .join(""),
    )
    .join("")}</tbody></table></div></section>
  ${report.maps.map((m) => m.html).join("\n")}</main><footer class="site-footer">The author decides. <a href="fonts/LICENSE.txt">DejaVu license</a></footer></body></html>`;
  return html.replace(
    /(href|src)="((?:data|svg|fonts)\/[^"?]+|metrics\.json|client\.js|page\.css|same-rank\.css|concept-map\.css)"/g,
    (_, attribute, path) => `${attribute}="${path}?v=${version}"`,
  );
}
export const page = { mapSection, document };
