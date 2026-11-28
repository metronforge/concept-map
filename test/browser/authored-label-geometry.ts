import type { Page } from "@playwright/test";
import type { ResolvedMap } from "../../src/schema";

export async function drawAuthored(page: Page, map: ResolvedMap) {
  await page.evaluate(async (map) => {
    const { renderFigure } = await import("/assets/integration.js");
    document.body.innerHTML = renderFigure(map);
    await document.fonts.ready;
  }, map);
}

export async function refineAuthored(page: Page, map: ResolvedMap) {
  return page.evaluate(async (map) => {
    const { refine, check, domMeasurer, renderFigure } =
      await import("/assets/integration.js");
    const measure = domMeasurer(document.querySelector(".map-figure")!);
    const report = check(map, map, {
      measureLabel(text, style) {
        const size = measure.measure(text, style);
        const padding = size.padding ?? 0;
        return {
          ...size,
          left: (size.left ?? 0) - padding,
          ascent: (size.ascent ?? (size.height * 5) / 6) + padding,
          width: size.width + 2 * padding,
          height: size.height + 2 * padding,
        };
      },
    });
    const touching = [report.labels, report.steps].flatMap((group) =>
      Object.values(group).flatMap((contacts) =>
        contacts.flatMap(({ a, b }) => [a, b]),
      ),
    );
    document.body.innerHTML = renderFigure(refine(map, measure));
    return touching;
  }, map);
}

export async function labelCentres(page: Page) {
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll<SVGTextElement>(".etext")].map((label) => {
        const box = label.getBoundingClientRect();
        return [
          label.dataset.edge!,
          [box.x + box.width / 2, box.y + box.height / 2],
        ];
      }),
    ),
  );
}

export async function compareAuthored(page: Page, map: ResolvedMap) {
  await drawAuthored(page, map);
  const before = await labelCentres(page);
  const touching = new Set(await refineAuthored(page, map));
  const after = await labelCentres(page);
  const clear = Object.keys(before).filter(
    (id) => !touching.has(`label:${id}`),
  );
  const shift = (id: string) =>
    Math.hypot(after[id][0] - before[id][0], after[id][1] - before[id][1]);
  return {
    clear: clear.length,
    shifted: clear.filter((id) => shift(id) > 0.5),
    maxShift: Math.max(0, ...clear.map(shift)),
  };
}
