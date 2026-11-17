import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { paintContacts } from "./paint-check";
for (const width of [1280, 390])
  test(`real label bounds protect badges after fonts and navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/integration/");
    await page.addStyleTag({ path: "css/concept-map.css" });
    await page.addStyleTag({
      content:
        ".map-ui.map-figure{display:block;margin:0}.map-ui .etext{letter-spacing:1px}",
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
      await expect.poll(() => paintContacts(page)).toEqual([]);
    }
    // A deliberately drawn collision must still fail this paint check.
    await page.evaluate(async () => {
      const { domMeasurer } = await import("/assets/integration.js");
      const player = document.querySelector("concept-map")!.player;
      const edge = player.map.edges.start;
      const size = domMeasurer(player.root).measure(edge.label.text, {
        fontSize: 10.5,
        mono: true,
        edge: "start",
      });
      edge.badge = [
        edge.label.at[0] + size.width / 2,
        edge.label.at[1] - size.ascent + size.height / 2,
      ];
      player.dispatch({ type: "mode", mode: "all" });
    });
    expect(
      (await paintContacts(page)).some((contact) => contact.b === "step:start"),
    ).toBe(true);
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
      "@font-face{font-family:LateBadge;src:url(/late-font.ttf);size-adjust:150%}.map-ui.map-figure{display:block}.map-ui .etext{font-family:LateBadge,monospace!important;font-size:16px!important;letter-spacing:1px}",
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
  const before = await page.evaluate(
    () => document.querySelector("concept-map")!.player.map.measurement,
  );
  release();
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector("concept-map")!.player.map.measurement,
      ),
    )
    .not.toEqual(before);
  expect(await paintContacts(page)).toEqual([]);
});
