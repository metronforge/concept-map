import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
for (const theme of ["light", "dark"])
  test(`edge labels mask underlying strokes in ${theme}`, async ({ page }) => {
    await page.goto("/integration/");
    await page.addStyleTag({ path: "css/concept-map.css" });
    const source = JSON.parse(readFileSync("examples/coffee/map.json", "utf8"));
    await page.evaluate(async (source) => {
      const { ConceptMapElement } = await import("/assets/integration.js");
      document.body.replaceChildren();
      const el = new ConceptMapElement();
      el.map = source;
      el.setAttribute("layout", "dagre");
      document.body.append(el);
      await el.ready;
      el.player.dispatch({ type: "mode", mode: "all" });
    }, source);
    const bg = theme === "dark" ? "rgb(23, 27, 35)" : "rgb(255, 255, 255)";
    await page
      .locator(".map-ui")
      .evaluate((el, bg) => el.style.setProperty("--cmap-bg", bg), bg);
    for (const label of await page.locator(".etext").all()) {
      await expect(label).toHaveCSS("paint-order", "stroke");
      await expect(label).toHaveCSS("stroke", bg);
      await expect(label).toHaveCSS("stroke-width", "4px");
    }
  });
