import type { PanelLabel } from "../model/panel-labels.js";
import { renderInline } from "./inline.js";

export function renderPanelLabels(labels: PanelLabel[] = [], step?: number) {
  const rows = labels.filter(
    (label) => step === undefined || label.step === step,
  );
  return rows.length
    ? `<ul class="arrow-labels">${rows.map((label) => `<li><span class="n">${label.step}</span><span class="label">${renderInline(label.text)}</span></li>`).join("")}</ul>`
    : "";
}
