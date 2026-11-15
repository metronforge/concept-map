import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
for (const engine of ["dagre", "elk"])
  test(`${engine}: the door self-transition touches the locked block twice`, async ({
    page,
  }) => {
    await page.goto("/integration/");
    await page.addStyleTag({ path: "css/concept-map.css" });
    const source = JSON.parse(readFileSync("examples/door/map.json", "utf8"));
    const result = await page.evaluate(
      async ({ source, engine }) => {
        const { ConceptMapElement } = await import("/assets/integration.js");
        document.body.replaceChildren();
        const el = new ConceptMapElement();
        el.map = source;
        el.setAttribute("layout", engine);
        document.body.append(el);
        await el.ready;
        const path = el.querySelector<SVGPathElement>(
          '[data-edge="blocked"] path',
        )!;
        const start = path.getPointAtLength(0),
          end = path.getPointAtLength(path.getTotalLength());
        const box = el
          .querySelector<SVGRectElement>('[data-node="locked"] rect')!
          .getBBox();
        return {
          start: { x: start.x, y: start.y },
          end: { x: end.x, y: end.y },
          box: { x: box.x, y: box.y, w: box.width, h: box.height },
          length: path.getTotalLength(),
        };
      },
      { source, engine },
    );
    for (const p of [result.start, result.end]) {
      const b = result.box;
      expect(p.x).toBeGreaterThanOrEqual(b.x - 0.01);
      expect(p.x).toBeLessThanOrEqual(b.x + b.w + 0.01);
      expect(p.y).toBeGreaterThanOrEqual(b.y - 0.01);
      expect(p.y).toBeLessThanOrEqual(b.y + b.h + 0.01);
    }
    expect(result.length).toBeGreaterThan(30);
    expect(result.start).not.toEqual(result.end);
  });
