import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { SourceMapSchema } from "../../src/schema";
import { layout, check } from "../../src/layout/index";
import { dagreEngine } from "../../src/layout/dagre";
import { elkEngine } from "../../src/layout/elk";
import { page as comparison } from "../../scripts/comparison/page.mjs";
import { geometryMetrics } from "../../scripts/comparison/metrics.mjs";
import { mountSameRank, sameRankState, sameRankReport } from "./same-rank-page";

for (const width of [1280, 390])
  for (const name of ["dagre", "elk"])
    for (const hinted of [false, true])
      test(`same-rank ${name} ${hinted ? "hinted" : "plain"} ${width}: real-font geometry holds in every state`, async ({
        page,
      }, info) => {
        const source = SourceMapSchema.parse(
          JSON.parse(readFileSync("examples/same-rank/map.json", "utf8")),
        );
        if (!hinted) delete source.layout;
        const map = await layout(
          source,
          name === "dagre" ? dagreEngine : elkEngine,
        );
        expect(check(source, map).hard).toBe(0);
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({
          reducedMotion: "reduce",
          colorScheme: "light",
        });
        await mountSameRank(
          page,
          map,
          comparisonMarkup(source, map, name, hinted),
        );
        const states = [];
        for (const [scenario, story] of map.scenarios.entries())
          for (const step of [...story.steps.keys(), "all"] as const) {
            const state = await sameRankState(page, scenario, step);
            const result = await sameRankReport(page, source);
            assertState(state, result, hinted);
            states.push(state);
          }
        const result = await sameRankReport(page, source);
        await saveEvidence(info, {
          viewport: width,
          engine: name,
          hinted,
          ...result,
          states,
        });
      });

function assertState(state, result, hinted: boolean) {
  expect(state.overflow).toBeLessThanOrEqual(0);
  expect(result.geometryMatches).toBe(true);
  expect(state.badges).toEqual(result.badges);
  expect(result.labelsVisible).toBe(true);
  expect(result.measurement.name).toBe("dom");
  expect(result.report.hard).toBe(0);
  expect(result.outcomes[0] === result.outcomes[1]).toBe(hinted);
  expect(result.report.constraints.map((c) => [c.kind, c.holds])).toEqual(
    hinted ? [["sameRank", true]] : [],
  );
  for (const size of state.textSizes) {
    expect(size).toBeGreaterThanOrEqual(state.pageFont - 0.1);
    expect(size).toBeLessThanOrEqual(state.pageFont * 1.25);
  }
}

async function saveEvidence(info, evidence) {
  const json = JSON.stringify(evidence, null, 2) + "\n";
  expect(json.trimEnd().split("\n").length).toBeLessThanOrEqual(500);
  await info.attach("same-rank", {
    body: json,
    contentType: "application/json",
  });
  if (!process.env.SAME_RANK_EVIDENCE_DIR) return;
  const { engine, hinted, viewport } = evidence;
  const dir = `${process.env.SAME_RANK_EVIDENCE_DIR}/browser/${info.project.name}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    `${dir}/${engine}-${hinted ? "hinted" : "plain"}-${viewport}.json`,
    json,
  );
}

function comparisonMarkup(source, map, name: string, hinted: boolean) {
  return comparison.mapSection(
    {
      id: hinted ? "same-rank" : "same-rank-plain",
      title: source.title,
      scenarios: source.scenarios,
      variants: {
        [name]: { metrics: geometryMetrics(source, map), timing: null },
      },
    },
    { [name]: map },
  );
}
