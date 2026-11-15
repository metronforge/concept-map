import { test, expect } from "@playwright/test";
test("empty details leave a complete panel border at wide and narrow widths", async ({
  page,
}) => {
  await page.goto("/integration/");
  await page.addStyleTag({ path: "css/concept-map.css" });
  await page.evaluate(async () => {
    const { mount } = await import("/assets/integration.js");
    const map = JSON.parse(
      document.querySelector("#server script")!.textContent!,
    );
    for (const s of map.scenarios)
      for (const t of s.steps) {
        t.sources = [];
        t.deeper = [];
        t.defs = [];
        delete t.code;
        delete t.fix;
        t.log = [];
      }
    const host = document.querySelector<HTMLElement>("#browser")!;
    host.style.cssText = "width:100%;container-type:inline-size";
    document.querySelector("#server")!.remove();
    document.querySelector("concept-map")!.remove();
    mount(host, map);
  });
  for (const width of [1440, 600]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator(".refs")).toHaveCount(0);
    await expect(page.locator(".panel.more")).toBeHidden();
    await expect(page.locator(".panel.head")).toHaveCSS(
      "border-bottom-width",
      "1px",
    );
    await expect(page.locator(".panel.head")).toHaveCSS(
      "border-bottom-left-radius",
      "8px",
    );
  }
});
