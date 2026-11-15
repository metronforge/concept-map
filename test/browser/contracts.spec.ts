import { test, expect } from "@playwright/test";
import fc from "fast-check";
import { mapPages } from "./helpers/player";
import { readFileSync } from "node:fs";
// This table is shared with the documented contract; tests intentionally need a real DOM.
const doc = readFileSync("docs/DOM.md", "utf8");
const contract = JSON.parse(
  doc.match(/<!-- contract-table\n([\s\S]*?)\n-->/)![1],
);
for (const entry of mapPages)
  test(`DOM contract ${entry.mapId}: initial controls, SVG and live status`, async ({
    page,
  }) => {
    await page.goto(entry.path);
    const root = page.locator('[data-figure="map"]');
    for (const { selector, attribute, value } of contract) {
      const element = root.locator(selector);
      await expect(element).toHaveCount(1);
      if (attribute) await expect(element).toHaveAttribute(attribute, value);
    }
  });
test("I2 counterexample property: pagehide changes state outside the available action fold", async ({
  page,
}) => {
  await page.goto("/2-actions/2-1-two-loops/");
  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async (count) => {
      const result = await page.evaluate(async (count) => {
        const url = new URL("/assets/player.js", location.href).href;
        const { MapPlayer } = await import(url);
        const original = document.querySelector<HTMLElement>(
            '[data-figure="map"]',
          )!,
          root = original.cloneNode(true) as HTMLElement;
        original.after(root);
        const player = new MapPlayer(
          root,
          JSON.parse(root.querySelector("[data-map-data]")!.textContent!),
          { reducedMotion: true },
        );
        for (let i = 0; i < count; i++) player.dispatch({ type: "next" });
        player.dispatch({ type: "mode", mode: "all" });
        const before = player.state;
        window.dispatchEvent(new PageTransitionEvent("pagehide"));
        const after = player.state;
        player.destroy();
        root.remove();
        return { before, after };
      }, count);
      expect(result.before.step).toBeGreaterThan(0);
      expect(result.after).toEqual({ scenario: 0, step: 0, mode: "all" });
      expect(result.after).not.toEqual(result.before);
    }),
    { numRuns: 5 },
  );
});
test("I8 counterexample property: browser marker identity differs from server markup", async ({
  page,
}) => {
  await page.goto("/2-actions/2-1-two-loops/");
  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 0, max: 9999 }), async (id) => {
      const result = await page.evaluate(async (id) => {
        const html = await (await fetch(location.href)).text(),
          doc = new DOMParser().parseFromString(html, "text/html");
        const root = doc.querySelector<HTMLElement>('[data-figure="map"]')!;
        root.id = "probe-" + id;
        document.body.append(root);
        const before = root.querySelector("marker")!.id;
        const { MapPlayer } = await import(
          new URL("/assets/player.js", location.href).href
        );
        const player = new MapPlayer(
          root,
          JSON.parse(root.querySelector("[data-map-data]")!.textContent!),
          { reducedMotion: true },
        );
        const after = root.querySelector("marker")!.id;
        player.destroy();
        root.remove();
        return { before, after };
      }, id);
      expect(result.after).not.toBe(result.before);
    }),
    { numRuns: 5 },
  );
});
test("I9 property: destroy aborts owned listeners, disconnects observer and makes controls inert", async ({
  page,
}) => {
  await page.goto("/2-actions/2-1-two-loops/");
  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 1, max: 4 }), async (repeats) => {
      const result = await page.evaluate(async (repeats) => {
        const { MapPlayer, connectConcepts } = await import(
          new URL("/assets/player.js", location.href).href
        );
        const original = document.querySelector<HTMLElement>(
            '[data-figure="map"]',
          )!,
          root = original.cloneNode(true) as HTMLElement;
        original.after(root);
        const concepts = document
          .querySelector<HTMLElement>("[data-map-concepts]")!
          .cloneNode(true) as HTMLElement;
        root.after(concepts);
        const signals: AbortSignal[] = [];
        const add = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (
          type,
          listener,
          options,
        ) {
          if (options && typeof options === "object" && options.signal)
            signals.push(options.signal);
          return add.call(this, type, listener, options);
        };
        const disconnect = ResizeObserver.prototype.disconnect;
        let disconnected = 0;
        ResizeObserver.prototype.disconnect = function () {
          disconnected++;
          return disconnect.call(this);
        };
        let player;
        try {
          player = new MapPlayer(
            root,
            JSON.parse(root.querySelector("[data-map-data]")!.textContent!),
            { reducedMotion: true },
          );
          connectConcepts(player, concepts);
        } finally {
          EventTarget.prototype.addEventListener = add;
        }
        for (let i = 0; i < repeats; i++) player.destroy();
        ResizeObserver.prototype.disconnect = disconnect;
        const state = player.state;
        root.querySelector<HTMLButtonElement>('[data-role="next"]')!.click();
        root.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
        player.dispatch({ type: "next" });
        window.dispatchEvent(new PageTransitionEvent("pagehide"));
        const result = {
          state,
          after: player.state,
          disconnected,
          registered: signals.length,
          aborted: signals.every((s) => s.aborted),
          animations: [...root.querySelectorAll(".token,.token-glow")].flatMap(
            (e) => e.getAnimations(),
          ).length,
        };
        root.remove();
        concepts.remove();
        return result;
      }, repeats);
      expect(result.registered).toBeGreaterThan(4);
      expect(result.aborted).toBe(true);
      expect(result.disconnected).toBe(1);
      expect(result.after).toEqual(result.state);
      expect(result.animations).toBe(0);
    }),
    { numRuns: 5 },
  );
});

test("format 3 host layer colours reach nodes, lanes and concept dots", async ({
  page,
}) => {
  await page.goto(mapPages[0].path);
  const colours = await page.evaluate(() => {
    const figure = document.querySelector<HTMLElement>('[data-figure="map"]')!;
    const map = JSON.parse(
      figure.querySelector("[data-map-data]")!.textContent!,
    );
    const node = figure.querySelector<SVGGElement>("[data-node]")!;
    const lane = figure.querySelector<SVGGElement>("[data-lane]")!;
    for (const layer of [
      map.nodes[node.dataset.node!].layer,
      map.lanes[lane.dataset.lane!].layer,
    ])
      figure.style.setProperty(`--cmap-layer-${layer}`, "#123456");
    const concepts = document.querySelector<HTMLElement>(
      "[data-map-concepts]",
    )!;
    concepts.style.setProperty(
      `--cmap-layer-${map.concepts[0].layer}`,
      "#123456",
    );
    return {
      node: getComputedStyle(node).getPropertyValue("--c").trim(),
      lane: getComputedStyle(lane).getPropertyValue("--c").trim(),
      dot: getComputedStyle(concepts.querySelector(".dot")!).backgroundColor,
    };
  });
  expect(colours).toEqual({
    node: "#123456",
    lane: "#123456",
    dot: "rgb(18, 52, 86)",
  });
});
