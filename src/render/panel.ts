import type { ResolvedMap } from "../schema.js";
import type { Frame } from "../model/frame.js";
import { escapeHtml as esc, renderInline } from "./inline.js";
export const defaultStrings = {
  replay: "Replay the flow",
  callLog: "Call log",
  fix: "Fix:",
  source: "Source",
  sourceLink: "Source ↗",
  newOnMap: "New on the map",
  goDeeper: "Go deeper",
  previousStep: "Previous step",
  nextStep: "Next step",
  stepsGroup: "Steps of this figure",
  step: "Step",
  nextScenario: "Next scenario:",
  hint: "Use ‹ › or the bars to move through this figure. Keyboard: ← →.",
};
export type UiStrings = typeof defaultStrings;
/** Plain text for the figure's live status: announced on each step or view
 *  change instead of the whole panel, so controls and hints stay silent. */
export function statusText(frame: Frame): string {
  return `${frame.panel.count}: ${frame.panel.title}`;
}
function parts(map: ResolvedMap, frame: Frame, overrides: Partial<UiStrings>) {
  const ui = { ...defaultStrings, ...overrides },
    p = frame.panel;
  if (p.kind === "all")
    return {
      lead: `<div class="count">${esc(p.count)}</div><h2>${esc(p.title)}</h2><p>${renderInline(p.text)}</p><div class="flowbar"><button type="button" data-role="replay">${esc(ui.replay)}</button></div>`,
      details: `<div class="all"><ol>${p.steps.map((title, n) => `<li data-li="${n}"><button type="button" data-go="${n}"><span class="n">${n + 1}</span><span>${esc(title)}</span></button></li>`).join("")}</ol></div><div class="log" data-role="flowlog"${p.hasFlowLog ? "" : " hidden"}><h3>${esc(ui.callLog)}</h3></div>`,
      controls: "",
    };
  let details = p.log.length
    ? `<div class="log"><h3>${esc(ui.callLog)}</h3>${p.log.map((l) => `<div class="${l.kind}">${esc(l.text)}</div>`).join("")}</div>`
    : "";
  if (p.fix)
    details += `<p class="fix"><strong>${esc(ui.fix)}</strong> ${renderInline(p.fix)}</p>`;
  if (p.code) {
    const c = p.code;
    details += `<div class="code"><div class="ttl"><span>${esc(c.title)}</span>${c.source ? `<a href="${esc(c.source.url)}">${esc(ui.sourceLink)}</a>` : ""}</div><pre>${c.lines.map((l) => `<span class="${l.trim().startsWith("// ✗") ? "bad" : l.trim().startsWith("// ✓") ? "good" : l.trim().startsWith("//") ? "cm" : ""}">${esc(l)}</span>`).join("\n")}</pre></div>`;
  }
  if (p.defs.length)
    details += `<div class="defs"><h3>${esc(ui.newOnMap)}</h3><dl>${p.defs.map((d) => `<div><dt>${esc(d.term)}</dt><dd>${renderInline(d.text)}</dd></div>`).join("")}</dl></div>`;
  details += `<div class="refs"><div class="src"><h3>${esc(ui.source)}</h3><ul>${p.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join("")}</ul></div>${p.deeper.length ? `<div><h3>${esc(ui.goDeeper)}</h3><ul>${p.deeper.map((d) => `<li><a href="${esc(d.href)}" target="_blank" rel="noopener">${esc(d.title)}</a></li>`).join("")}</ul></div>` : ""}</div>`;
  const steps = map.scenarios[frame.state.scenario].steps.map((t) => t.title),
    index = frame.state.step;
  return {
    lead: `<div class="count">${esc(p.count)}</div><h2>${esc(p.title)}</h2><p>${renderInline(p.text)}</p>`,
    details,
    controls: `<div class="stepper" role="group" aria-label="${esc(ui.stepsGroup)}"><button type="button" class="sbtn" data-role="back" aria-label="${esc(ui.previousStep)}"${p.canBack ? "" : " disabled"}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg></button><ol class="segs">${steps.map((title, n) => `<li><button type="button" data-seg="${n}" aria-label="${esc(ui.step)} ${n + 1}: ${esc(title)}"${n === index ? ' aria-current="step"' : ""} class="${n < index ? "done" : n === index ? "now" : ""}"></button></li>`).join("")}</ol><button type="button" class="sbtn fwd" data-role="next" aria-label="${esc(ui.nextStep)}"${p.canNext ? "" : " disabled"}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg></button></div><div class="hint">${p.nextScenario ? `${esc(ui.nextScenario)} <button type="button" class="linkbtn" data-role="nextscenario">${esc(p.nextScenario)}</button>. ` : ""}${esc(ui.hint)}</div>`,
  };
}
export function renderPanel(
  map: ResolvedMap,
  frame: Frame,
  strings: Partial<UiStrings> = {},
): string {
  const p = parts(map, frame, strings);
  return p.lead + p.details + p.controls;
}
export function renderPanelParts(
  map: ResolvedMap,
  frame: Frame,
  strings: Partial<UiStrings> = {},
) {
  const p = parts(map, frame, strings);
  return { head: p.lead + p.controls, more: p.details };
}
