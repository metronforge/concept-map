import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { layout } from "../../src/layout/index";
import { dagreEngine } from "../../src/layout/dagre";
import { elkEngine } from "../../src/layout/elk";
import { ResolvedMapSchema } from "../../src/schema";

test("resizing moves labels to the panel and restores them without changing state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/integration/");
  await page.addStyleTag({ path: "css/concept-map.css" });
  const map = ResolvedMapSchema.parse(
    JSON.parse(readFileSync("test/fixtures/map.json", "utf8")),
  );
  map.scenarios[0].repeatBadges = [];
  map.edges.ab.label = {
    text: "Use `code` with *care* and **bold**",
    at: [65, 104],
  };
  map.viewBox = [600, 200];
  // A 16-unit corridor fits wide-screen text, but cannot fit the larger text
  // at 390 px, even after the shared placement stage searches for room.
  map.nodes.a.box = [0, 0, 600, 92];
  map.nodes.b.box = [0, 108, 600, 92];
  map.edges.ab.path = "M35 92 V108";
  await page.evaluate(async (map) => {
    const { mount } = await import("/assets/integration.js");
    document.body.replaceChildren();
    const host = document.createElement("div");
    host.style.containerType = "inline-size";
    document.body.append(host);
    const player = mount(host, map, { reducedMotion: true });
    player.root.style.margin = "0";
    player.root.style.display = "block";
    window.testPlayer = player;
    player.dispatch({ type: "go", step: 1 });
    await document.fonts.ready;
  }, map);
  const group = page.locator("[data-map-edge-labels]");
  await expect(group).not.toHaveAttribute("visibility", "hidden");
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(group).toHaveAttribute("visibility", "hidden");
  await expect(group).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".arrow-labels code")).toHaveText("code");
  await expect(page.locator(".arrow-labels em")).toHaveText("care");
  await expect(page.locator(".arrow-labels strong")).toHaveText("bold");
  await expect(page.locator(".arrow-labels .n")).toHaveText("2");
  await page.setViewportSize({ width: 1280, height: 1000 });
  await expect(group).not.toHaveAttribute("visibility", "hidden");
  await expect(group).not.toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".arrow-labels")).toHaveCount(0);
  expect(await page.evaluate(() => window.testPlayer.state)).toEqual({
    scenario: 0,
    step: 1,
    mode: "step",
  });
  await page.getByRole("button", { name: "Whole map", exact: true }).click();
  const log = await page.locator('[data-role="flowlog"]').textContent();
  const focused = page.locator('[data-go="1"]');
  await focused.focus();
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(group).toHaveAttribute("visibility", "hidden");
  await expect(focused).toBeFocused();
  await expect(page.locator('[data-role="flowlog"]')).toHaveText(log!);
  await expect(page.locator('[data-li="1"]')).toHaveClass(/now/);
});

for (const width of [1280, 390])
  for (const name of ["coffee", "door", "gcd"])
    for (const engine of ["dagre", "elk"] as const)
      test(`${name} ${engine} ${width}px: every shown presentation has no hard arrow-label contact`, async ({
        page,
      }) => {
        const source = JSON.parse(
          readFileSync(`examples/${name}/map.json`, "utf8"),
        );
        const map = await layout(
          source,
          engine === "dagre" ? dagreEngine : elkEngine,
        );
        await page.setViewportSize({ width, height: 1000 });
        await page.goto("/integration/");
        await page.addStyleTag({ path: "css/concept-map.css" });
        const { inspectPresentations } = await import("./helpers/panel-labels");
        expect(await inspectPresentations(page, [map])).toEqual([]);
      });

test("all 23 hand-drawn book maps at 390px have no hard arrow-label contact", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/integration/");
  await page.addStyleTag({ path: "css/concept-map.css" });
  const maps = JSON.parse(readFileSync("test/fixtures/book-maps.json", "utf8"));
  expect(maps).toHaveLength(23);
  const { inspectPresentations } = await import("./helpers/panel-labels");
  expect(
    await inspectPresentations(
      page,
      maps.map(({ map }) => map),
    ),
  ).toEqual([]);
});
