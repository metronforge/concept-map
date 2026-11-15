import { test, expect } from "@playwright/test";
for (const natural of [240, 1800])
  test(`map width ${natural} only shrinks to fit`, async ({ page }) => {
    await page.goto("/integration/");
    await page.addStyleTag({ path: "css/concept-map.css" });
    await page.addStyleTag({ content: ".map-figure{display:block;margin:0}" });
    await page.evaluate(async (natural) => {
      const { mount } = await import("/assets/integration.js");
      const map = JSON.parse(
        document.querySelector("#server script")!.textContent!,
      );
      map.viewBox = [natural, 600];
      document.body.replaceChildren();
      const host = document.createElement("div");
      host.id = "sizing";
      document.body.append(host);
      mount(host, map);
    }, natural);
    for (const available of [1200, 320, 900]) {
      await page
        .locator("#sizing")
        .evaluate((el, width) => (el.style.width = `${width}px`), available);
      const dimensions = await page.locator(".map svg").evaluate((el) => ({
        width: el.getBoundingClientRect().width,
        parent: el.parentElement!.clientWidth - 12,
      }));
      expect(dimensions.width).toBeLessThanOrEqual(natural + 0.1);
      expect(dimensions.width).toBeCloseTo(
        Math.min(natural, dimensions.parent),
        0,
      );
    }
  });
