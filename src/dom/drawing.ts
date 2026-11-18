import type { ResolvedMap } from "../schema.js";
import {
  nodeText,
  laneGeometry,
  frameText,
  calloutPoint,
} from "../render/positions.js";

function attributes(element: Element, values: Record<string, number | string>) {
  for (const [name, value] of Object.entries(values)) {
    const text = String(value);
    if (element.getAttribute(name) !== text) element.setAttribute(name, text);
  }
}
function move(element: Element, [x, y]: number[]) {
  attributes(element, { x, y });
}
function box(group: Element, [x, y, width, height]: number[]) {
  attributes(group.querySelector("rect")!, { x, y, width, height });
}

/** Apply another geometry of the same map without replacing live SVG elements.
 * The caller applies the current frame and fits text after these writes. */
export function updateDrawing(svg: SVGSVGElement, map: ResolvedMap) {
  attributes(svg, { viewBox: `0 0 ${map.viewBox.join(" ")}` });
  svg.querySelectorAll<SVGGElement>(".node[data-node]").forEach((group) => {
    const node = map.nodes[group.dataset.node!];
    const text = nodeText(node);
    box(group, node.box);
    move(group.querySelector("text")!, text.main);
    const tag = group.querySelector(".tag");
    if (tag) move(tag, text.tag);
  });
  svg.querySelectorAll<SVGGElement>(".lane[data-lane]").forEach((group) => {
    const lane = laneGeometry(map.lanes[group.dataset.lane!], map);
    box(group, lane.box);
    move(group.querySelector("text")!, lane.text);
  });
  svg.querySelectorAll<SVGGElement>(".frame[data-frame]").forEach((group) => {
    const frame = map.frames[group.dataset.frame!];
    box(group, frame.box);
    move(group.querySelector("text")!, frameText(frame.box));
  });
  updateEdges(svg, map);
  svg
    .querySelectorAll<SVGGElement>(".callout[data-callout]")
    .forEach((group) => {
      const node = map.nodes[map.callouts[group.dataset.callout!][0]];
      const [cx, cy] = calloutPoint(node.box);
      attributes(group.querySelector("circle")!, { cx, cy });
      move(group.querySelector("text")!, [cx, cy + 0.5]);
    });
}

function updateEdges(svg: SVGSVGElement, map: ResolvedMap) {
  svg.querySelectorAll<SVGGElement>("g.edge[data-edge]").forEach((group) => {
    attributes(group.querySelector("path")!, {
      d: map.edges[group.dataset.edge!].path,
    });
  });
  svg.querySelectorAll<SVGTextElement>(".etext[data-edge]").forEach((label) => {
    move(label, map.edges[label.dataset.edge!].label!.at);
  });
}
