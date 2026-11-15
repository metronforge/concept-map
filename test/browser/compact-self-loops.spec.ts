import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

for (const engine of ["dagre", "elk"])
  for (const direction of ["right", "down"])
    test(`${engine} ${direction}: compact door loop and label clear neighboring blocks`, async ({
      page,
    }) => {
      await page.goto("/integration/");
      await page.addStyleTag({ path: "css/concept-map.css" });
      const source = JSON.parse(readFileSync("examples/door/map.json", "utf8"));
      source.direction = direction;
      const result = await page.evaluate(
        async ({ source, engine }) => {
          const { ConceptMapElement } = await import("/assets/integration.js");
          document.body.replaceChildren();
          const el = new ConceptMapElement();
          el.map = source;
          el.setAttribute("layout", engine);
          document.body.append(el);
          await el.ready;
          // Measure routing at native scale, independently of responsive label fitting.
          const svg = el.querySelector("svg")!;
          svg.style.width = `${svg.viewBox.baseVal.width}px`;
          svg.style.maxWidth = "none";
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          const rect = (element: SVGGraphicsElement) => {
            const b = element.getBoundingClientRect();
            const matrix = element.ownerSVGElement!.getScreenCTM()!;
            return {
              x: (b.x - matrix.e) / matrix.a,
              y: (b.y - matrix.f) / matrix.d,
              w: b.width / matrix.a,
              h: b.height / matrix.d,
            };
          };
          const path = el.querySelector<SVGPathElement>(
            '[data-edge="blocked"] path',
          )!;
          const label = el.querySelector<SVGTextElement>(
            'text[data-edge="blocked"]',
          )!;
          return {
            loop: rect(path),
            label: rect(label),
            node: rect(
              el.querySelector<SVGRectElement>('[data-node="locked"] rect')!,
            ),
            neighbors: [
              ...el.querySelectorAll<SVGGraphicsElement>(
                '[data-node]:not([data-node="locked"]) rect, [data-node]:not([data-node="locked"]) text',
              ),
            ].map(rect),
          };
        },
        { source, engine },
      );
      expect(result.loop.h).toBeLessThanOrEqual(result.node.h);
      expect(result.loop.h).toBeGreaterThan(0);
      expect(result.label.w).toBeGreaterThan(0);
      const x = Math.min(result.loop.x, result.label.x);
      const y = Math.min(result.loop.y, result.label.y);
      const right = Math.max(
        result.loop.x + result.loop.w,
        result.label.x + result.label.w,
      );
      const bottom = Math.max(
        result.loop.y + result.loop.h,
        result.label.y + result.label.h,
      );
      expect(bottom - y).toBeLessThanOrEqual(result.node.h + 0.01);
      expect(result.neighbors.length).toBeGreaterThanOrEqual(8);
      for (const box of result.neighbors)
        expect(
          right + 8 <= box.x ||
            box.x + box.w + 8 <= x ||
            bottom + 8 <= box.y ||
            box.y + box.h + 8 <= y,
          JSON.stringify({
            loop: result.loop,
            label: result.label,
            neighbor: box,
          }),
        ).toBe(true);
    });
