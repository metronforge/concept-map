import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { SourceMapSchema } from "../../src/schema";
import { layout } from "../../src/layout/index";
import { dagreEngine } from "../../src/layout/dagre";
import { elkEngine } from "../../src/layout/elk";
import { page as comparison } from "../../scripts/comparison/page.mjs";
import { geometryMetrics } from "../../scripts/comparison/metrics.mjs";
import { mountSameRank, sameRankState } from "./same-rank-page";

for (const width of [1280, 390])
  for (const name of ["dagre", "elk"])
    for (const hinted of [false, true])
      test(`free ${name} ${hinted ? "hinted" : "plain"} ${width}: real-font geometry holds in every state`, async ({
        page,
      }, info) => {
        const input = JSON.parse(
          readFileSync("examples/free/map.json", "utf8"),
        );
        if (!hinted) delete input.layout;
        const source = SourceMapSchema.parse(input);
        const map = await layout(
          source,
          name === "dagre" ? dagreEngine : elkEngine,
          { intent: false },
        );
        expect(map.nodes.plan.box[1] < map.nodes.review.box[1]).toBe(hinted);
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({
          reducedMotion: "reduce",
          colorScheme: "light",
        });
        const markup = comparison.mapSection(
          {
            id: hinted ? "free" : "free-plain",
            title: source.title,
            scenarios: source.scenarios,
            variants: {
              [name]: { metrics: geometryMetrics(source, map), timing: null },
            },
          },
          { [name]: map },
        );
        await mountSameRank(page, map, markup);
        const states = [];
        let finalReport;
        for (const [scenario, story] of map.scenarios.entries())
          for (const step of [...story.steps.keys(), "all"] as const) {
            const state = await sameRankState(page, scenario, step);
            const report = await page.evaluate(async (source) => {
              const { check, domMeasurer } =
                await import("/assets/integration.js");
              const player = window.sameRankPlayer;
              return check(source, player.map, {
                measureLabel: domMeasurer(player.root),
              });
            }, source);
            expect(state.overflow).toBeLessThanOrEqual(0);
            expect(report.hard).toBe(0);
            expect(report.constraints.map((c) => [c.kind, c.holds])).toEqual(
              hinted ? [["free", null]] : [],
            );
            for (const size of state.textSizes) {
              expect(size).toBeGreaterThanOrEqual(state.pageFont - 0.1);
              expect(size).toBeLessThanOrEqual(state.pageFont * 1.25);
            }
            states.push(state);
            finalReport = report;
          }
        const evidence = {
          viewport: width,
          engine: name,
          hinted,
          measurement: map.measurement,
          report: finalReport,
          boxes: Object.fromEntries(
            Object.entries(map.nodes).map(([id, node]) => [id, node.box]),
          ),
          states,
        };
        const json = JSON.stringify(evidence, null, 2) + "\n";
        expect(json.trimEnd().split("\n").length).toBeLessThanOrEqual(500);
        await info.attach("free", {
          body: json,
          contentType: "application/json",
        });
        if (process.env.FREE_EVIDENCE_DIR) {
          const dir = `${process.env.FREE_EVIDENCE_DIR}/browser/${info.project.name}`;
          mkdirSync(dir, { recursive: true });
          writeFileSync(
            `${dir}/${name}-${hinted ? "hinted" : "plain"}-${width}.json`,
            json,
          );
        }
      });
