import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ResolvedMapSchema } from "../../src/schema";
import { fontTableMeasurer } from "../../src/layout/index";

test("panel labels wait for one em of container growth before returning", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/integration/");
  await page.addStyleTag({ path: "css/concept-map.css" });
  const map = ResolvedMapSchema.parse(
    JSON.parse(readFileSync("test/fixtures/map.json", "utf8")),
  );
  map.scenarios[0].repeatBadges = [];
  map.viewBox = [600, 200];
  map.nodes.a.box = [0, 0, 600, 92];
  map.nodes.b.box = [0, 108, 600, 92];
  map.edges.ab.path = "M35 92 V108";
  map.edges.ab.label = { text: "go", at: [65, 104] };
  // This synthetic gap was sized around a font-table label centre. Record
  // that size so resizing tests the same geometry as measured layout maps.
  map.measurement = {
    name: fontTableMeasurer.name,
    labels: {
      ab: fontTableMeasurer.measure("go", { fontSize: 10.5, mono: true }),
    },
  };
  await page.evaluate(async (map) => {
    const { mount } = await import("/assets/integration.js");
    document.body.replaceChildren();
    const host = document.createElement("div");
    host.id = "resize-host";
    host.style.width = "1000px";
    host.style.containerType = "inline-size";
    document.body.append(host);
    const player = mount(host, map, { reducedMotion: true });
    player.root.style.margin = "0";
    player.root.style.display = "block";
    window.testPlayer = player;
    player.dispatch({ type: "go", step: 1 });
    await document.fonts.ready;
  }, map);
  const sample = (width: number) =>
    page.evaluate(async (width) => {
      const { check, domMeasurer } = await import("/assets/integration.js");
      document.getElementById("resize-host")!.style.width = `${width}px`;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      const player = window.testPlayer;
      const report = check(player.map, player.map, {
        measureLabel: domMeasurer(player.root),
      });
      const label = player.root.querySelector<SVGTextElement>(".etext")!;
      const svg = player.root.querySelector("svg")!;
      const container = svg.parentElement!;
      const css = getComputedStyle(container);
      const contentWidth =
        container.clientWidth -
        parseFloat(css.paddingLeft) -
        parseFloat(css.paddingRight);
      const textSize =
        (parseFloat(getComputedStyle(label).fontSize) *
          svg.getBoundingClientRect().width) /
        player.map.viewBox[0];
      return {
        defect: [
          ...Object.values(report.labels).flat(),
          ...report.steps.labels,
        ].some((contact) => contact.band === "defect"),
        panel:
          player.root
            .querySelector("[data-map-edge-labels]")!
            .getAttribute("visibility") === "hidden",
        widthEm: contentWidth / textSize,
        textSize,
        svgWidth: svg.getBoundingClientRect().width,
        padding:
          parseFloat(css.paddingLeft) +
          parseFloat(css.paddingRight) +
          parseFloat(css.borderLeftWidth) +
          parseFloat(css.borderRightWidth),
      };
    }, width);
  // Find the real-font boundary without freezing a browser-specific font metric.
  expect((await sample(1000)).defect).toBe(false);
  expect((await sample(390)).defect).toBe(true);
  let low = 390,
    high = 1000;
  for (let i = 0; i < 10; i++) {
    const middle = (low + high) / 2;
    if ((await sample(middle)).defect) low = middle;
    else high = middle;
  }
  expect((await sample(1000)).panel).toBe(false);
  const before = await page.evaluate(() => ({
    state: window.testPlayer.state,
    url: location.href,
  }));
  const focus = page.locator('[data-role="back"]');
  await focus.focus();
  const switched = await sample(low);
  expect(switched.defect).toBe(true);
  expect(switched.panel).toBe(true);
  const clean = await sample(high);
  expect(clean.defect).toBe(false);
  expect(clean.widthEm - switched.widthEm).toBeLessThan(1);
  expect(clean.panel).toBe(true);
  await sample(low - 40);
  expect((await sample(high)).panel).toBe(true);
  const restored = await sample(low + switched.textSize + 2);
  expect(restored.widthEm - switched.widthEm).toBeGreaterThanOrEqual(1);
  expect(restored.defect).toBe(false);
  expect(restored.panel).toBe(false);
  // Returning to wide clears the old boundary before the next resize cycle.
  expect((await sample(low - 40)).panel).toBe(true);
  expect((await sample(high)).panel).toBe(false);
  expect(
    await page.evaluate(() => ({
      state: window.testPlayer.state,
      url: location.href,
    })),
  ).toEqual(before);
  await expect(focus).toBeFocused();

  // Cap a fresh drawing just above the measured contact boundary. Further
  // container growth must still release the panel when the SVG stops growing.
  await page.evaluate(
    async ({ map, fontSize }) => {
      const { mount } = await import("/assets/integration.js");
      window.testPlayer.destroy();
      const host = document.getElementById("resize-host")!;
      host.replaceChildren();
      host.style.width = "1000px";
      host.style.fontSize = `${fontSize}px`;
      const player = mount(host, map, { reducedMotion: true });
      player.root.style.margin = "0";
      player.root.style.display = "block";
      window.testPlayer = player;
      player.dispatch({ type: "go", step: 1 });
    },
    { map, fontSize: ((high - clean.padding + 2) * 10.5) / map.viewBox[0] },
  );
  expect((await sample(1000)).panel).toBe(false);
  const cappedSwitch = await sample(low);
  expect(cappedSwitch.defect).toBe(true);
  expect(cappedSwitch.panel).toBe(true);
  const cappedClean = await sample(high + 4);
  expect(cappedClean.defect).toBe(false);
  expect(cappedClean.widthEm - cappedSwitch.widthEm).toBeLessThan(1);
  expect(cappedClean.panel).toBe(true);
  const cappedReturn = await sample(low + cappedSwitch.textSize + 3);
  expect(cappedReturn.svgWidth).toBe(cappedClean.svgWidth);
  expect(cappedReturn.widthEm - cappedSwitch.widthEm).toBeGreaterThanOrEqual(1);
  expect(cappedReturn.defect).toBe(false);
  expect(cappedReturn.panel).toBe(false);
});
