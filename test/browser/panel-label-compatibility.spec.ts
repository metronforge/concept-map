import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ResolvedMapSchema } from "../../src/schema";

for (const path of [
  "M35 40 A30 30 0 0 1 35 100",
  "M35 40 A30 30 0 0135 100",
  "M35 40",
])
  test(`hand paths still mount and resize: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/integration/");
    await page.addStyleTag({ path: "css/concept-map.css" });
    const map = ResolvedMapSchema.parse(
      JSON.parse(readFileSync("test/fixtures/map.json", "utf8")),
    );
    map.edges.ab.path = path;
    map.edges.ab.label = { text: "Go", at: [50, 70] };
    await page.evaluate(async (map) => {
      const { mount } = await import("/assets/integration.js");
      document.body.replaceChildren();
      const host = document.createElement("div");
      host.style.containerType = "inline-size";
      document.body.append(host);
      window.testPlayer = mount(host, map, { reducedMotion: true });
      await document.fonts.ready;
    }, map);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(() => window.testPlayer.map.measurement?.name),
      ).toBe("dom");
      await expect(page.locator('[data-edge="ab"] path')).toHaveAttribute(
        "d",
        path,
      );
    }
  });

test("node step numbers also move covered labels to the panel", async ({
  page,
}) => {
  await page.goto("/integration/");
  await page.addStyleTag({ path: "css/concept-map.css" });
  const map = ResolvedMapSchema.parse(
    JSON.parse(readFileSync("test/fixtures/map.json", "utf8")),
  );
  map.scenarios[0].display.nodeBadges = true;
  map.scenarios[0].repeatBadges = [];
  map.edges.ab.label = { text: "go", at: [61, 18] };
  const { inspectPresentations } = await import("./helpers/panel-labels");
  expect(await inspectPresentations(page, [map])).toEqual([]);
  await expect(page.locator("[data-map-edge-labels]")).toHaveAttribute(
    "visibility",
    "hidden",
  );
  await expect(page.locator(".arrow-labels .label")).toHaveText("go");
});
