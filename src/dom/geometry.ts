import type { ResolvedMap } from "../schema.js";
import { labelMinimum, fitNodeLabels, fitEdgeLabel } from "../model/labels.js";
export interface Geometry {
  pathLength(edge: string): number;
  pointAt(edge: string, t: number): [number, number];
  textBox(el: SVGGraphicsElement): {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
export function geometry(svg: SVGSVGElement): Geometry {
  const path = (edge: string) =>
    svg.querySelector<SVGPathElement>(`g.edge[data-edge="${edge}"] path`)!;
  return {
    pathLength: (edge) => path(edge).getTotalLength(),
    pointAt(edge, t) {
      const p = path(edge),
        at = p.getPointAtLength(p.getTotalLength() * t);
      return [at.x, at.y];
    },
    textBox: (el) => el.getBBox(),
  };
}
/** Measurements are browser-owned; all fitting decisions are pure model math. */
export function sizeLabels(root: HTMLElement, map: ResolvedMap, geo: Geometry) {
  const svg = root.querySelector<SVGSVGElement>(".map svg")!;
  const width = svg.getBoundingClientRect().width;
  if (width)
    root.style.setProperty(
      "--map-label-min",
      `${labelMinimum(map.viewBox[0], width)}px`,
    );
  svg.querySelectorAll<SVGTextElement>(".node .tag").forEach((tag) => {
    tag.removeAttribute("textLength");
    const node =
      map.nodes[(tag.parentElement as unknown as SVGGElement).dataset.node!];
    if (!node) return;
    if (tag.getComputedTextLength() > node.box[2] - 16) {
      tag.setAttribute("textLength", String(node.box[2] - 16));
      tag.setAttribute("lengthAdjust", "spacing");
    }
    const label =
      tag.parentElement!.querySelector<SVGTextElement>("text:not(.tag)")!;
    label.setAttribute("y", String(node.box[1] + 17));
    tag.setAttribute("y", String(node.box[1] + 32));
    const fitted = fitNodeLabels(
      node.box,
      geo.textBox(label),
      geo.textBox(tag),
    );
    label.setAttribute("y", String(fitted.main));
    tag.setAttribute("y", String(fitted.tag));
  });
  svg.querySelectorAll<SVGTextElement>(".etext").forEach((label) => {
    const edge = map.edges[label.dataset.edge!];
    if (!edge.label) return;
    label.textContent = edge.label.text;
    const lines = fitEdgeLabel(
      edge.label.text,
      edge.label.at,
      map.viewBox[0],
      label.getComputedTextLength(),
      parseFloat(getComputedStyle(label).fontSize),
    );
    if (!lines) return;
    label.replaceChildren(
      ...lines.map((line) => {
        const span = root.ownerDocument.createElementNS(
          "http://www.w3.org/2000/svg",
          "tspan",
        );
        span.setAttribute("x", String(line.x));
        span.setAttribute("y", String(line.y));
        span.textContent = line.text;
        return span;
      }),
    );
  });
}
