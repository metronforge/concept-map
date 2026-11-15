import type { ResolvedMap } from "../schema.js";
import { derive, type Frame, type Badge } from "../model/frame.js";
import { initialState } from "../model/state.js";
import { escapeHtml as esc } from "./inline.js";
export function renderBadges(badges: Badge[]): string {
  return badges
    .map(
      (b) =>
        `<g class="badge${b.current ? " cur" : ""}"><circle cx="${b.x}" cy="${b.y}" r="8"></circle><text x="${b.x}" y="${b.y + 0.5}">${b.n}</text></g>`,
    )
    .join("");
}
export function renderSvg(
  map: ResolvedMap,
  options: { frame?: Frame; markerId?: string } = {},
): string {
  const frame = options.frame ?? derive(map, initialState),
    marker = esc(
      options.markerId ?? `map-arrow-${map.id.replaceAll(".", "-")}`,
    );
  let html = `<svg viewBox="0 0 ${map.viewBox.join(" ")}" role="img" aria-label="${esc(map.title)}"><defs><marker id="${marker}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted-fg)"></path></marker></defs><g data-map-layers>`;
  for (const [id, l] of Object.entries(map.lanes))
    html += `<g class="lane${frame.lanes[id].revealed ? "" : " ghost"}" data-lane="${esc(id)}" style="--c:var(--cmap-layer-${esc(l.layer)},var(--cmap-layer))"><rect x="${l.x ?? 6}" y="${l.y}" width="${l.w ?? map.viewBox[0] - 12}" height="${l.h}" rx="6"></rect><text x="${map.direction === "right" ? (l.x ?? 6) + 10 : 16}" y="${l.y + 16}">${esc(l.label)}</text></g>`;
  for (const [id, f] of Object.entries(map.frames)) {
    const [x, y, w, h] = f.box;
    html += `<g class="frame${frame.frames[id].revealed ? "" : " ghost"}" data-frame="${esc(id)}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"></rect><text x="${x + w - 8}" y="${y + 16}" text-anchor="end">${esc(f.label)}</text></g>`;
  }
  html += `</g><g data-map-edges>`;
  for (const [id, e] of Object.entries(map.edges))
    html += `<g class="edge${e.dashed ? " dash" : ""}${frame.edges[id].revealed ? "" : " ghost"}${frame.edges[id].current ? " cur" : ""}" data-edge="${esc(id)}"><path d="${esc(e.path)}" marker-end="url(#${marker})"></path></g>`;
  html += `</g><g data-map-nodes>`;
  for (const [id, n] of Object.entries(map.nodes)) {
    const [x, y, w, h] = n.box,
      f = frame.nodes[id];
    const numbers = Object.entries(map.callouts)
      .filter(([, ids]) => ids.includes(id))
      .map(([number]) => number);
    html += `<g class="node${n.custom ? " custom" : ""}${n.fail ? " fail" : ""}${f.revealed ? "" : " ghost"}${f.current ? " cur" : ""}" style="--c:var(--cmap-layer-${esc(n.layer)},var(--cmap-layer))" data-node="${esc(id)}"${numbers.length ? ` data-callout="${esc(numbers.join(" "))}"` : ""}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"></rect><text x="${x + 10}" y="${y + (n.tag ? 17 : h / 2 + 4.5)}" class="${n.mono ? "mono" : ""}">${esc(f.label)}</text>${n.tag ? `<text x="${x + 10}" y="${y + 32}" class="tag">${esc(n.tag)}</text>` : ""}</g>`;
  }
  html += `</g><g data-map-edge-labels>`;
  for (const [id, e] of Object.entries(map.edges))
    if (e.label)
      html += `<text x="${e.label.at[0]}" y="${e.label.at[1]}" class="etext${frame.edgeLabels[id].revealed ? "" : " ghost"}" data-edge="${esc(id)}">${esc(e.label.text)}</text>`;
  html += `</g><g data-map-badges>${renderBadges(frame.badges)}</g><g data-map-token><circle r="11" class="token-glow" visibility="hidden"></circle><circle r="6" class="token" visibility="hidden"></circle></g><g data-map-callouts>`;
  for (const [number, ids] of Object.entries(map.callouts)) {
    const n = map.nodes[ids[0]];
    if (!n) continue;
    const [x, y] = n.box;
    html += `<g class="callout" data-callout="${esc(number)}"><circle cx="${x + 4}" cy="${y + 4}" r="8"></circle><text x="${x + 4}" y="${y + 4.5}">${esc(number)}</text></g>`;
  }
  return html + `</g></svg>`;
}
