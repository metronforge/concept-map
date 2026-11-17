import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { paintContacts } from "./paint-check.js";
for (const example of ["coffee", "door", "gcd"])
  test(`${example}: visible badges do not cover label text`, async ({
    page,
  }) => {
    await page.goto("/integration/");
    await page.addStyleTag({ path: "css/concept-map.css" });
    await page.addStyleTag({
      content:
        ".map-ui.map-figure{display:block}.map-ui .map svg{min-width:760px}",
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
      await document.fonts.ready;
    }, source);
    for (let scenario = 0; scenario < source.scenarios.length; scenario++) {
      await page.evaluate((scenario) => {
        const el = document.querySelector("concept-map")!;
        el.player.dispatch({ type: "scenario", index: scenario });
        el.player.dispatch({ type: "mode", mode: "all" });
      }, scenario);
      expect(await paintContacts(page)).toEqual([]);
    }
  });
