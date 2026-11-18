import { test, expect } from "@playwright/test";
import { SourceMapSchema } from "../../src/schema";
import { layout } from "../../src/layout/index";
import { dagreEngine } from "../../src/layout/dagre";
import { elkEngine } from "../../src/layout/elk";

const source = SourceMapSchema.parse({
  format: 3,
  id: "crowded-arrows",
  title: "Crowded arrow labels",
  direction: "right",
  layers: { service: { label: "Service" } },
  nodes: Object.fromEntries(
    ["a", "b", "c", "d"].map((id) => [
      id,
      { label: id.toUpperCase(), layer: "service" },
    ]),
  ),
  edges: Object.fromEntries(
    ["a", "b", "c"].map((id, i) => [
      id,
      {
        from: id,
        to: ["b", "c", "d"][i],
        label: "A deliberately long arrow label",
      },
    ]),
  ),
  scenarios: [
    {
      id: "all",
      label: "All",
      steps: [
        {
          id: "all",
          title: "All",
          text: "Show every arrow",
          show: ["a", "b", "c", "d"],
          edges: ["a", "b", "c"],
        },
      ],
    },
  ],
});

for (const engine of ["dagre", "elk"] as const)
  test(`${engine}: the element lazily requests a narrow layout from its selected engine`, async ({
    page,
  }) => {
    const adapter = engine === "dagre" ? dagreEngine : elkEngine;
    const original = await layout(source, adapter);
    await page.setViewportSize({ width: 2000, height: 1000 });
    await page.emulateMedia({
      reducedMotion: "reduce",
      colorScheme: "light",
    });
    await page.goto("/integration/");
    await page.addStyleTag({ path: "css/concept-map.css" });
    await page.evaluate(
      async ({ source, original, engine }) => {
        const { ConceptMapElement, NarrowLayout, mount, check, domMeasurer } =
          await import("/assets/integration.js");
        document.body.replaceChildren();
        const requests: number[] = [];
        const candidates: { width: number; map: typeof original }[] = [];
        const get = NarrowLayout.prototype.get;
        NarrowLayout.prototype.get = function (width) {
          requests.push(width);
          const map = get.call(this, width);
          if (map) candidates.push({ width, map });
          return map;
        };
        const el = new ConceptMapElement();
        el.style.width = "100%";
        el.style.containerType = "inline-size";
        el.map = source;
        el.setAttribute("layout", engine);
        document.body.append(el);
        const player = await el.ready;
        const host = document.createElement("div");
        host.style.width = "100%";
        host.style.containerType = "inline-size";
        document.body.append(host);
        const reference = mount(host, original, { reducedMotion: true });
        const settle = async () => {
          await document.fonts.ready;
          for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
        };
        const sample = () => {
          const drawn = structuredClone(player.map);
          const panel =
            getComputedStyle(
              player.root.querySelector("[data-map-edge-labels]"),
            ).visibility === "hidden";
          if (panel)
            for (const edge of Object.values(drawn.edges)) delete edge.label;
          return {
            sameDrawing:
              JSON.stringify(player.map) === JSON.stringify(reference.map),
            presentation: panel ? "panel" : "wide",
            hard: check(source, drawn, {
              measureLabel: domMeasurer(player.root),
            }).hard,
          };
        };
        await settle();
        window.narrowElement = {
          requests,
          candidates,
          sample,
          settle,
          wide: sample(),
          initialRequests: requests.length,
        };
      },
      { source, original, engine },
    );
    expect(
      await page.evaluate(() => window.narrowElement.initialRequests),
    ).toBe(0);
    expect(await page.evaluate(() => window.narrowElement.wide)).toEqual({
      sameDrawing: true,
      presentation: "wide",
      hard: 0,
    });
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.waitForFunction(
      () => window.narrowElement.candidates.length > 0,
    );
    const result = await page.evaluate(async () => {
      const probe = window.narrowElement;
      await probe.settle();
      return {
        selected: probe.sample(),
        requests: probe.requests,
        candidate: probe.candidates.at(-1),
      };
    });
    expect(result.selected).toEqual({
      sameDrawing: true,
      presentation: "panel",
      hard: 0,
    });
    expect(result.candidate.width).toBeGreaterThan(0);
    expect(result.candidate.map).toEqual(
      await layout(source, adapter, { widthEm: result.candidate.width }),
    );
  });
