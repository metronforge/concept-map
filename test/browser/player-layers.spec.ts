import { expect, test } from "@playwright/test";
import type { ResolvedMap } from "../src/lib/concept-map/schema";
import { reducedFlow } from "../src/lib/concept-map/model/flow";
import {
  domSnapshot,
  expectedSnapshot,
  finishAnimations,
  mapPages,
} from "./helpers/player";
const references = ["0-1", "2-1", "2-4", "5-2"];
for (const mapId of references)
  for (const layout of [
    { width: 1280, theme: "light" },
    { width: 390, theme: "dark" },
  ] as const) {
    const entry = mapPages.find((p) => p.mapId === mapId && p.path !== "/")!;
    test.describe(`@player ${mapId} ${layout.width}px ${layout.theme}`, () => {
      test.use({
        viewport: { width: layout.width, height: 1000 },
        hasTouch: layout.width === 390,
      });
      const errors = new WeakMap<object, string[]>();
      test.beforeEach(async ({ page }) => {
        const messages: string[] = [];
        errors.set(page, messages);
        page.on("pageerror", (e) => messages.push(e.message));
        page.on("console", (m) => {
          if (m.type() === "error") messages.push(m.text());
        });
        await page.addInitScript(
          (theme) => localStorage.setItem("starlight-theme", theme),
          layout.theme,
        );
      });
      test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
      test("every scenario, step and mode equals derive; keyboard, focus and page lifecycle", async ({
        page,
      }) => {
        await page.goto(entry.path);
        const root = page.locator('[data-figure="map"]');
        const map: ResolvedMap = await root
          .locator("[data-map-data]")
          .evaluate((e) => JSON.parse(e.textContent!));
        const captures = await root.evaluate((root, source) => {
          const read = new Function("root", `return (${source})(root)`);
          const map = JSON.parse(
            root.querySelector("[data-map-data]")!.textContent!,
          );
          const click = (selector: string) =>
            (root.querySelector(selector) as HTMLElement).click();
          const result: {
            scenario: number;
            step: number;
            mode: "step" | "all";
            snapshot: unknown;
          }[] = [];
          map.scenarios.forEach((scenario: any, index: number) => {
            click('[data-mode="step"]');
            click(`[data-scenario="${scenario.id}"]`);
            scenario.steps.forEach((_step: any, step: number) => {
              click('[data-mode="step"]');
              click(`[data-seg="${step}"]`);
              result.push({
                scenario: index,
                step,
                mode: "step",
                snapshot: read(root),
              });
              click('[data-mode="all"]');
              result.push({
                scenario: index,
                step,
                mode: "all",
                snapshot: read(root),
              });
            });
          });
          click('[data-mode="step"]');
          click(`[data-scenario="${map.scenarios[0].id}"]`);
          return result;
        }, domSnapshot.toString());
        for (const c of captures)
          expect(
            c.snapshot,
            `${mapId}/${c.scenario}/${c.step}/${c.mode}`,
          ).toEqual(expectedSnapshot(map, c));
        await root.evaluate((root) =>
          root
            .getAnimations({ subtree: true })
            .forEach((animation) => animation.finish()),
        );
        const svg = await root.locator(".map svg").innerHTML();
        await finishAnimations(page, 3000);
        expect(await root.locator(".map svg").innerHTML()).toBe(svg);
        expect(await root.locator(".node").count()).toBe(
          Object.keys(map.nodes).length,
        );
        expect(await root.locator(".node.ghost").count()).toBeGreaterThan(0);
        expect(await root.locator(".ghost.failnow,.ghost.warn").count()).toBe(
          0,
        );
        await expect(root.locator(".token")).toHaveAttribute(
          "visibility",
          "hidden",
        );
        const colours = await root.locator(".node.ghost").evaluateAll((nodes) =>
          nodes.map((node) => ({
            stroke: getComputedStyle(node.querySelector("rect")!).stroke,
            label: getComputedStyle(node.querySelector("text")!).fill,
          })),
        );
        expect(new Set(colours.map((c) => c.stroke)).size).toBe(1);
        expect(new Set(colours.map((c) => c.label)).size).toBe(1);
        await root.press("ArrowLeft");
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          "0",
        );
        await root.locator('[data-role="next"]').click();
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          "1",
        );
        await expect(root.locator('[data-role="next"]')).toBeFocused();
        await root.locator('[data-role="back"]').click();
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          "0",
        );
        await root.press("ArrowRight");
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          "1",
        );
        await root.press("ArrowLeft");
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          "0",
        );
        await root.locator('[data-seg="1"]').click();
        await root.locator('[data-mode="all"]').click();
        await root.locator('[data-mode="step"]').click();
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          "1",
        );
        const last = map.scenarios[0].steps.length - 1;
        await root.locator(`[data-seg="${last}"]`).click();
        await root.press("ArrowRight");
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          String(last),
        );
        await expect(root.locator('[data-role="next"]')).toBeDisabled();
        await root.locator('[data-role="nextscenario"]').click();
        await expect(
          root.locator('[data-scenario][aria-pressed="true"]'),
        ).toHaveAttribute("data-scenario", map.scenarios[1].id);
        await root.locator("[data-scenario]").nth(1).click();
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          "0",
        );
        await root.evaluate((root) => {
          const input = document.createElement("input");
          root.append(input);
          input.focus();
          input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
          );
          input.remove();
        });
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          "0",
        );
        await page.evaluate(() => {
          window.dispatchEvent(new PageTransitionEvent("pagehide"));
          window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true }),
          );
        });
        await expect(
          root.locator('[data-scenario][aria-pressed="true"]'),
        ).toHaveAttribute("data-scenario", map.scenarios[0].id);
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          "0",
        );
        await root.locator('[data-seg="1"]').click();
        await page.reload();
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          "0",
        );
        await root.locator('[data-seg="1"]').click();
        await page.goto("/");
        await page.goBack();
        await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
          "data-seg",
          "0",
        );
        expect(await page.evaluate(() => location.hash)).toBe("");
        expect(
          await page.evaluate(() =>
            Object.keys(localStorage).filter((k) => k !== "starlight-theme"),
          ),
        ).toEqual([]);
        // The initial state is idle: there is no token animation scheduled after resets.
        expect(
          await root.evaluate(
            (root) =>
              root
                .getAnimations({ subtree: true })
                .filter(
                  (a) =>
                    (a.effect as KeyframeEffect).target instanceof Element &&
                    ((a.effect as KeyframeEffect).target as Element).matches(
                      ".token,.token-glow",
                    ),
                ).length,
          ),
        ).toBe(0);
        expect(svg).toContain("data-map-nodes");
      });
      test("animation follows paths, logs and hop steps; replay and selection cancel", async ({
        page,
      }) => {
        await page.goto(entry.path);
        const root = page.locator('[data-figure="map"]'),
          token = root.locator(".token");
        const map: ResolvedMap = await root
          .locator("[data-map-data]")
          .evaluate((e) => JSON.parse(e.textContent!));
        for (const scenario of map.scenarios.filter((s) => s.flow?.length)) {
          await root.locator(`[data-scenario="${scenario.id}"]`).click();
          await root.locator('[data-mode="all"]').click();
          await expect(token).toHaveAttribute("visibility", "visible");
          await expect(root.locator('[data-role="flowlog"] .line')).toHaveCount(
            0,
          );
          // Seek the first travel through native animations. No fake RAF clock or sleeps.
          const midpoint = await root.evaluate(async (root) => {
            const animations = () =>
              document.getAnimations().filter((a) => {
                const t = (a.effect as KeyframeEffect)?.target;
                return (
                  t instanceof Element &&
                  root.contains(t) &&
                  t.matches(".token,.token-glow")
                );
              });
            for (let phase = 0; phase < 200; phase++) {
              for (let i = 0; i < 4; i++) await Promise.resolve();
              const current = animations();
              if (!current.length) return null;
              current.forEach((a) => a.pause());
              const travel = current.find((a) =>
                (a.effect as KeyframeEffect)
                  .getKeyframes()
                  .some((k) => "offsetDistance" in k),
              );
              if (travel) {
                const circle = root.querySelector<SVGCircleElement>(".token")!,
                  svg = circle.ownerSVGElement!;
                const position = () => {
                  const box = circle.getBoundingClientRect();
                  return new DOMPoint(
                    box.x + box.width / 2,
                    box.y + box.height / 2,
                  ).matrixTransform(svg.getScreenCTM()!.inverse());
                };
                current.forEach((animation) => (animation.currentTime = 0));
                const start = position();
                current.forEach(
                  (animation) =>
                    (animation.currentTime =
                      Number(animation.effect!.getTiming().duration) / 2),
                );
                const point = position();
                let distance = Infinity;
                const probe = document.createElement("div");
                const paths = [
                  ...root.querySelectorAll<SVGPathElement>("g.edge.trail path"),
                ].filter((path) => {
                  probe.style.offsetPath = `path("${path.getAttribute("d")}")`;
                  return probe.style.offsetPath === circle.style.offsetPath;
                });
                if (!paths.length)
                  throw new Error(
                    "Active motion path is not an authored trail edge",
                  );
                for (const path of paths) {
                  const length = path.getTotalLength(),
                    n = Math.max(1, Math.ceil(length * 4));
                  for (let i = 0; i <= n; i++) {
                    const p = path.getPointAtLength((length * i) / n);
                    distance = Math.min(
                      distance,
                      Math.hypot(point.x - p.x, point.y - p.y),
                    );
                  }
                }
                const expected = paths[0].getPointAtLength(
                  paths[0].getTotalLength() / 2,
                );
                return {
                  distance,
                  midpointDistance: Math.hypot(
                    point.x - expected.x,
                    point.y - expected.y,
                  ),
                  moved: Math.hypot(point.x - start.x, point.y - start.y),
                };
              }
              current.forEach((a) => a.finish());
            }
            throw new Error("No travel phase");
          });
          if (scenario.flow!.some((h) => h.edge))
            expect(midpoint).not.toBeNull();
          if (midpoint !== null) {
            expect(midpoint.distance).toBeLessThanOrEqual(1);
            expect(midpoint.midpointDistance).toBeLessThanOrEqual(1);
            expect(midpoint.moved).toBeGreaterThan(1);
          }
          const active = Number(
            await root.locator("[data-li].now").getAttribute("data-li"),
          );
          expect(
            scenario.flow!.some(
              (h) =>
                scenario.steps.findIndex((s) => s.id === h.step) === active,
            ),
          ).toBe(true);
          const expected = scenario.flow!.flatMap((h) => h.log),
            partial = await root
              .locator('[data-role="flowlog"] .line')
              .allTextContents();
          expect(partial).toEqual(expected.slice(0, partial.length));
          await finishAnimations(page);
          await expect(token).toHaveAttribute("visibility", "hidden");
          expect(
            await root.locator('[data-role="flowlog"] .line').allTextContents(),
          ).toEqual(expected);
          await expect(root.locator("[data-li].now")).toHaveAttribute(
            "data-li",
            String(
              scenario.steps.findIndex(
                (s) => s.id === scenario.flow!.at(-1)!.step,
              ),
            ),
          );
          for (const edge of new Set(
            scenario.flow!.flatMap((h) => (h.edge ? [h.edge] : [])),
          ))
            await expect(
              root.locator(`g.edge[data-edge="${edge}"]`),
            ).toHaveClass(/trail/);
          expect(await root.locator(".badge").count()).toBeGreaterThan(0);
          const route = await root.locator(".edge.trail").count();
          await root.locator('[data-mode="all"]').click();
          await finishAnimations(page, 5000);
          expect(await root.locator(".edge.trail").count()).toBe(route);
          expect(
            await root.locator('[data-role="flowlog"] .line').allTextContents(),
          ).toEqual(expected);
          await root.locator('[data-role="replay"]').click();
          await expect(token).toHaveAttribute("visibility", "visible");
          await expect(root.locator('[data-role="flowlog"] .line')).toHaveCount(
            0,
          );
          await finishAnimations(page, 700);
          const selected = Math.min(2, scenario.steps.length - 1);
          await root.locator(`[data-go="${selected}"]`).click();
          await expect(token).toHaveAttribute("visibility", "hidden");
          await finishAnimations(page, 3000);
          await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
            "data-seg",
            String(selected),
          );
          expect(
            await root.evaluate(
              (root) =>
                root.getAnimations({ subtree: true }).filter((a) => {
                  const t = (a.effect as KeyframeEffect)?.target;
                  return (
                    t instanceof Element && t.matches(".token,.token-glow")
                  );
                }).length,
            ),
          ).toBe(0);
        }
      });
      test("reduced flows are immediate; concepts and callouts support pointer and focus", async ({
        page,
      }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(entry.path);
        const root = page.locator('[data-figure="map"]');
        const map: ResolvedMap = await root
          .locator("[data-map-data]")
          .evaluate((e) => JSON.parse(e.textContent!));
        for (const [index, scenario] of map.scenarios.entries()) {
          await root.locator(`[data-scenario="${scenario.id}"]`).click();
          await root.locator('[data-mode="all"]').click();
          const flow = reducedFlow(map, index);
          await expect(root.locator(".token")).toHaveAttribute(
            "visibility",
            "hidden",
          );
          expect(
            await root.locator('[data-role="flowlog"] .line').allTextContents(),
          ).toEqual(flow.log.map((l) => l.text));
          for (const edge of flow.trail)
            await expect(
              root.locator(`g.edge[data-edge="${edge}"]`),
            ).toHaveClass(/trail/);
          for (const node of flow.visited)
            await expect(root.locator(`[data-node="${node}"]`)).toHaveClass(
              /visit/,
            );
          for (const node of flow.failed)
            await expect(root.locator(`[data-node="${node}"]`)).toHaveClass(
              /failnow/,
            );
          expect(
            await root.evaluate(
              (r) => r.getAnimations({ subtree: true }).length,
            ),
          ).toBe(0);
        }
        for (const row of await page
          .locator("[data-map-concepts] li[data-nodes]")
          .all()) {
          const nodes = (await row.getAttribute("data-nodes"))!.split(/\s+/);
          await row.hover();
          for (const n of nodes)
            await expect(root.locator(`[data-node="${n}"]`)).toHaveClass(/hl/);
          const button = row.locator("[data-step]");
          await button.focus();
          for (const n of nodes)
            await expect(root.locator(`[data-node="${n}"]`)).toHaveClass(/hl/);
          const step = Number(await button.getAttribute("data-step")),
            scenario =
              (await button.getAttribute("data-concept-scenario")) ||
              map.conceptScenario;
          await button.click();
          await expect(
            root.locator('[data-scenario][aria-pressed="true"]'),
          ).toHaveAttribute("data-scenario", scenario);
          await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
            "data-seg",
            String(step),
          );
          await expect(root.locator(`[data-seg="${step}"]`)).toBeFocused();
          await page.keyboard.press(step ? "ArrowLeft" : "ArrowRight");
          await expect(root.locator('[aria-current="step"]')).toHaveAttribute(
            "data-seg",
            String(step ? step - 1 : 1),
          );
        }
        for (const marker of await root.locator("svg .callout").all())
          await expect(marker).toBeHidden();
        for (const n of Object.keys(map.callouts)) {
          const prose = page.locator(`[data-prose-callout="${n}"]`).first();
          if (layout.width === 390) await prose.tap();
          else await prose.click();
          for (const id of map.callouts[n])
            await expect(root.locator(`[data-node="${id}"]`)).toHaveAttribute(
              "data-callout-active",
              "",
            );
          const marker = root.locator(`[data-figure-callout="${n}"]`);
          await expect(marker).toBeVisible();
          if (layout.width === 390) await marker.tap();
          else await marker.click();
          await expect(
            page
              .locator(`[data-callout-paragraph-active] [data-callout="${n}"]`)
              .first(),
          ).toBeVisible();
        }
      });
    });
  }
