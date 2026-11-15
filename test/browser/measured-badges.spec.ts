import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
for (const width of [1280, 390])
  test(`real label bounds protect badges after fonts and navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/integration/");
    await page.addStyleTag({ path: "css/concept-map.css" });
    await page.addStyleTag({
      content:
        ".map-figure{display:block;margin:0}.map-ui .etext{letter-spacing:1px}",
    });
    const source = JSON.parse(readFileSync("examples/door/map.json", "utf8"));
    source.scenarios[0].display.edgeBadges = true;
    await page.evaluate(async (source) => {
      const { ConceptMapElement } = await import("/assets/integration.js");
      document.body.replaceChildren();
      const el = new ConceptMapElement();
      el.style.width = "100%";
      el.map = source;
      el.setAttribute("layout", "dagre");
      document.body.append(el);
      await el.ready;
      await document.fonts.ready;
    }, source);
    for (let step = 0; step < source.scenarios[0].steps.length; step++) {
      await page.evaluate(
        (step) =>
          document
            .querySelector("concept-map")!
            .player.dispatch({ type: "go", step }),
        step,
      );
      await expect(page.locator(".badge circle")).not.toHaveCount(0);
      await expect
        .poll(async () =>
          page.evaluate(() => {
            const labels = [
              ...document.querySelectorAll(".etext:not(.ghost)"),
            ].map((e) => e.getBoundingClientRect());
            return [...document.querySelectorAll(".badge circle")].filter(
              (e) => {
                const b = e.getBoundingClientRect(),
                  x = b.x + b.width / 2,
                  y = b.y + b.height / 2;
                return labels.some(
                  (t) =>
                    Math.hypot(
                      Math.max(t.left - x, 0, x - t.right),
                      Math.max(t.top - y, 0, y - t.bottom),
                    ) <
                    b.width / 2 + 1,
                );
              },
            ).length;
          }),
        )
        .toBe(0);
    }
  });

test("font readiness refits measured badges without another player action", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/late-font.ttf", async (route) => {
    await gate;
    await route.fulfill({
      contentType: "font/ttf",
      body: readFileSync("test/fixtures/fonts/DejaVuSans.ttf"),
    });
  });
  await page.goto("/integration/");
  await page.addStyleTag({ path: "css/concept-map.css" });
  await page.addStyleTag({
    content:
      "@font-face{font-family:LateBadge;src:url(/late-font.ttf);size-adjust:150%}.map-figure{display:block}.map-ui .etext{font-family:LateBadge,monospace;font-size:16px!important;letter-spacing:1px}",
  });
  const source = JSON.parse(readFileSync("examples/door/map.json", "utf8"));
  await page.evaluate(async (source) => {
    const { ConceptMapElement } = await import("/assets/integration.js");
    document.body.replaceChildren();
    const el = new ConceptMapElement();
    el.style.width = "960px";
    el.map = source;
    el.setAttribute("layout", "dagre");
    document.body.append(el);
    await el.ready;
    el.player.dispatch({ type: "mode", mode: "all" });
  }, source);
  expect(await page.evaluate(() => document.fonts.status)).toBe("loading");
  const before = await page
    .locator(".badge")
    .evaluateAll((es) => es.map((e) => e.getAttribute("transform")));
  release();
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page
        .locator(".badge")
        .evaluateAll((es) => es.map((e) => e.getAttribute("transform"))),
    )
    .not.toEqual(before);
  const overlaps = await page.evaluate(() => {
    const labels = [...document.querySelectorAll(".etext:not(.ghost)")].map(
      (e) => e.getBoundingClientRect(),
    );
    return [...document.querySelectorAll(".badge circle")].filter((e) => {
      const b = e.getBoundingClientRect(),
        x = b.x + b.width / 2,
        y = b.y + b.height / 2;
      return labels.some(
        (t) =>
          Math.hypot(
            Math.max(t.left - x, 0, x - t.right),
            Math.max(t.top - y, 0, y - t.bottom),
          ) <
          b.width / 2 + 1,
      );
    }).length;
  });
  expect(overlaps).toBe(0);
});
