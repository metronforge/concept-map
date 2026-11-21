import type { Page } from "@playwright/test";
import type { ResolvedMap, SourceMap } from "../../src/schema";

export async function mountSameRank(
  page: Page,
  map: ResolvedMap,
  markup: string,
) {
  await page.goto("/integration/");
  await page.evaluate(() =>
    document.querySelectorAll("style").forEach((el) => el.remove()),
  );
  await page.route("**/fonts/*.ttf", (route) =>
    route.fulfill({
      path: `test/fixtures/fonts/${new URL(route.request().url()).pathname.split("/").pop()}`,
      contentType: "font/ttf",
    }),
  );
  for (const path of [
    "css/concept-map.css",
    "scripts/comparison/page.css",
    "scripts/comparison/same-rank.css",
  ])
    await page.addStyleTag({ path });
  await page.evaluate(
    async ({ map, markup }) => {
      const { MapPlayer } = await import("/assets/integration.js");
      document.body.innerHTML = `<main>${markup}</main>`;
      const root = document.querySelector("[data-player]");
      await document.fonts.ready;
      window.sameRankPlayer = new MapPlayer(root, map, { reducedMotion: true });
      await document.fonts.ready;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    },
    { map, markup },
  );
}

export function sameRankState(
  page: Page,
  scenario: number,
  step: number | "all",
) {
  return page.evaluate(
    async ({ scenario, step }) => {
      const player = window.sameRankPlayer;
      player.dispatch({ type: "mode", mode: "step" });
      player.dispatch({ type: "scenario", index: scenario });
      player.dispatch(
        step === "all" ? { type: "mode", mode: "all" } : { type: "go", step },
      );
      await document.fonts.ready;
      const svg = player.root.querySelector("svg")!;
      const labels = [...svg.querySelectorAll(".node text:not(.tag), .etext")];
      return {
        scenario,
        step,
        overflow: document.documentElement.scrollWidth - innerWidth,
        pageFont: parseFloat(getComputedStyle(document.body).fontSize),
        textSizes: labels.map(
          (el) =>
            parseFloat(getComputedStyle(el).fontSize) * svg.getScreenCTM()!.a,
        ),
        badges: [...svg.querySelectorAll(".badge circle")].map((el) => [
          +el.getAttribute("cx"),
          +el.getAttribute("cy"),
        ]),
      };
    },
    { scenario, step },
  );
}

export async function sameRankReport(page: Page, source: SourceMap) {
  const geometry = await page.evaluate(geometryMatches);
  const result = await page.evaluate(async (source) => {
    const { check, domMeasurer, derive } =
      await import("/assets/integration.js");
    const player = window.sameRankPlayer;
    const report = check(source, player.map, {
      measureLabel: domMeasurer(player.root),
    });
    return {
      report,
      measurement: player.map.measurement,
      outcomes: [player.map.nodes.quick.box[1], player.map.nodes.finish.box[1]],
      badges: derive(player.map, player.state).badges.map((b) => [b.x, b.y]),
      labelsVisible:
        getComputedStyle(player.root.querySelector("[data-map-edge-labels]")!)
          .visibility !== "hidden",
    };
  }, source);
  return { ...result, geometryMatches: geometry };
}

function geometryMatches() {
  const { root, map } = window.sameRankPlayer;
  const labels = [...root.querySelectorAll(".etext")].every((el) => {
    const at = map.edges[el.dataset.edge].label.at;
    return +el.getAttribute("x") === at[0] && +el.getAttribute("y") === at[1];
  });
  const nodes = [...root.querySelectorAll(".node")].every((el) => {
    const box = map.nodes[el.dataset.node].box;
    const rect = el.querySelector("rect");
    return ["x", "y", "width", "height"].every(
      (key, i) => +rect.getAttribute(key) === box[i],
    );
  });
  const edges = [...root.querySelectorAll(".edge")].every(
    (el) =>
      el.querySelector("path").getAttribute("d") ===
      map.edges[el.dataset.edge].path,
  );
  return labels && nodes && edges;
}
