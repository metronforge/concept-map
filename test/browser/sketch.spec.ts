import { expect, test } from "@playwright/test";
import { SourceMapSchema } from "../../src/schema";
import { layout } from "../../src/layout/index";
import { elkEngine } from "../../src/layout/elk";
import { exampleMaps } from "../../scripts/comparison/maps.mjs";
import { page as comparison } from "../../scripts/comparison/page.mjs";
import { geometryMetrics } from "../../scripts/comparison/metrics.mjs";
import { mountSameRank, sameRankState } from "./same-rank-page";

for (const width of [1280, 390])
  for (const id of ["sketch-plain", "sketch", "sketch-required"])
    test(`${id} at ${width}: real-font geometry holds in every state`, async ({
      page,
    }) => {
      const source = SourceMapSchema.parse(
        exampleMaps().find((example) => example.id === id)!.source,
      );
      const map = await layout(source, elkEngine);
      const name = "elk";
      const markup = comparison.mapSection(
        {
          id,
          title: source.title,
          scenarios: source.scenarios,
          variants: {
            [name]: { metrics: geometryMetrics(source, map), timing: null },
          },
        },
        { [name]: map },
      );
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await mountSameRank(page, map, markup);
      for (const [scenario, story] of map.scenarios.entries())
        for (const step of [...story.steps.keys(), "all"] as const) {
          const state = await sameRankState(page, scenario, step);
          expect(state.overflow).toBeLessThanOrEqual(0);
          for (const size of state.textSizes) {
            expect(size).toBeGreaterThanOrEqual(state.pageFont - 0.1);
            expect(size).toBeLessThanOrEqual(state.pageFont * 1.25);
          }
          const report = await page.evaluate(async (source) => {
            const { check, domMeasurer } =
              await import("/assets/integration.js");
            const player = window.sameRankPlayer;
            return check(source, player.map, {
              measureLabel: domMeasurer(player.root),
            });
          }, source);
          expect(report.hard).toBe(0);
          expect(report.constraints.map((c) => [c.kind, c.holds])).toEqual(
            id === "sketch-plain"
              ? []
              : Array.from({ length: 4 }, () => [
                  "pin",
                  id === "sketch-required" ? true : null,
                ]),
          );
        }
    });
