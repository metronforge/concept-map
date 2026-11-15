import { placeBadge } from "../model/badge-placement.js";
/** Refit from original SVG coordinates, after text fitting and font readiness. */
export function fitBadges(svg: SVGSVGElement): void {
  const matrix = svg.getScreenCTM()?.inverse();
  if (!matrix) return;
  const measure = (selector: string) =>
    [...svg.querySelectorAll<SVGGraphicsElement>(selector)].map((el) => {
      const rect = el.getBoundingClientRect();
      const a = new DOMPoint(rect.left, rect.top).matrixTransform(matrix);
      const b = new DOMPoint(rect.right, rect.bottom).matrixTransform(matrix);
      return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
    });
  const boxes = measure(".etext:not(.ghost)");
  const nodes = measure(".node:not(.ghost) rect");
  const bounds = svg.viewBox.baseVal;
  for (const badge of svg.querySelectorAll<SVGGElement>(".badge")) {
    const circle = badge.querySelector("circle")!;
    const x = circle.cx.baseVal.value,
      y = circle.cy.baseVal.value;
    const point = placeBadge(
      [x, y],
      circle.r.baseVal.value,
      boxes,
      bounds,
      nodes,
    );
    badge.setAttribute(
      "transform",
      `translate(${point[0] - x} ${point[1] - y})`,
    );
  }
}
