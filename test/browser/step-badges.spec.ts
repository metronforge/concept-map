import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
for (const example of ["coffee", "door", "gcd"])
  test(`${example}: visible badges do not cover label text`, async ({
    page,
  }) => {
    await page.goto("/integration/");
    await page.addStyleTag({ path: "css/concept-map.css" });
    await page.addStyleTag({
      content: ".map-figure{display:block}.map-ui .map svg{min-width:760px}",
    });
    const source = JSON.parse(
      readFileSync(`examples/${example}/map.json`, "utf8"),
    );
    await page.evaluate(async (source) => {
      const { ConceptMapElement } = await import("/assets/integration.js");
      document.body.replaceChildren();
      const el = new ConceptMapElement();
      el.style.width = "960px";
      el.map = source;
      el.setAttribute("layout", "dagre");
      document.body.append(el);
      await el.ready;
    }, source);
    for (let scenario = 0; scenario < source.scenarios.length; scenario++) {
      await page.evaluate((scenario) => {
        const el = document.querySelector("concept-map")!;
        el.player.dispatch({ type: "scenario", index: scenario });
        el.player.dispatch({ type: "mode", mode: "all" });
      }, scenario);
      const overlaps = await page.evaluate(() => {
        const boxes = [...document.querySelectorAll(".etext:not(.ghost)")].map(
          (e) => e.getBoundingClientRect(),
        );
        return [...document.querySelectorAll(".badge circle")].flatMap((e) => {
          const b = e.getBoundingClientRect();
          return boxes
            .filter(
              (t) =>
                Math.hypot(
                  Math.max(
                    t.left - (b.x + b.width / 2),
                    0,
                    b.x + b.width / 2 - t.right,
                  ),
                  Math.max(
                    t.top - (b.y + b.height / 2),
                    0,
                    b.y + b.height / 2 - t.bottom,
                  ),
                ) <
                b.width / 2 + 1,
            )
            .map((t) => ({
              badge: { x: b.x, y: b.y },
              label: { x: t.x, y: t.y },
            }));
        });
      });
      expect(overlaps).toEqual([]);
    }
  });
