import type { ResolvedMap } from "../schema.js";
import { escapeHtml as esc, renderInline } from "./inline.js";
export function renderConcepts(map: ResolvedMap): string {
  return `<div class="concepts">${map.concepts
    .map(
      (g) =>
        `<section class="cgroup" style="--c:var(--cmap-layer-${esc(g.layer)},var(--cmap-layer))"><h3><span class="dot" aria-hidden="true"></span>${esc(g.label)}</h3><ul>${g.items
          .map((c) => {
            const scenario = map.scenarios.find(
              (s) =>
                s.id ===
                (c.step.scenario ?? map.conceptScenario ?? map.scenarios[0].id),
            )!;
            const index = scenario.steps.findIndex((s) => s.id === c.step.step);
            return `<li data-nodes="${esc(c.nodes.join(" "))}"><span class="term">${esc(map.definitions[c.definition].term)}</span><span class="def">${renderInline(c.short)}</span><span class="meta">${c.source ? `<a href="${esc(c.source.url)}" title="${esc(c.source.label)}">Source ↗</a>` : ""}<button type="button" data-step="${index}"${c.step.scenario ? ` data-concept-scenario="${esc(c.step.scenario)}"` : ""}>Step ${index + 1}</button></span></li>`;
          })
          .join("")}</ul></section>`,
    )
    .join("")}</div>`;
}
export function renderDeeper(map: ResolvedMap): string {
  return `<ul class="deeper">${map.deeper.map((d) => `<li><a href="${esc(d.href)}">${esc(d.title)}</a><span>${renderInline(d.why)}</span></li>`).join("")}</ul>`;
}
