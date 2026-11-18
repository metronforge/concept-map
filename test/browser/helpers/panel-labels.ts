import type { Page } from "@playwright/test";
import type { ResolvedMap } from "../../../src/schema";

/** Read the SVG actually shown, independently of the player's presentation choice. */
export async function inspectPresentations(page: Page, maps: ResolvedMap[]) {
  return (await inspectPresentationReports(page, maps)).errors;
}

/** Retain the full check and selected presentation for each visited state. */
export async function inspectPresentationReports(
  page: Page,
  maps: ResolvedMap[],
) {
  return page.evaluate(async (maps) => {
    const { mount, check, domMeasurer, describeDefects } =
      await import("/assets/integration.js");
    const errors: string[] = [];
    const states: {
      id: string;
      scenario: number;
      step: number | string;
      presentation: string;
      hard: number;
      defects: string[];
      lineBoxDefects: string[][];
    }[] = [];
    for (const original of maps) {
      document.body.replaceChildren();
      const host = document.createElement("div");
      host.style.containerType = "inline-size";
      document.body.append(host);
      const player = mount(host, original, { reducedMotion: true });
      player.root.style.margin = "0";
      await document.fonts.ready;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      for (const [scenario, story] of original.scenarios.entries()) {
        player.dispatch({ type: "mode", mode: "step" });
        player.dispatch({ type: "scenario", index: scenario });
        for (const step of [...story.steps.keys(), "all"]) {
          player.dispatch(
            step === "all"
              ? { type: "mode", mode: "all" }
              : { type: "go", step },
          );
          const name = `${original.id}:${scenario}:${step}`;
          const drawn = structuredClone(player.map);
          for (const label of player.root.querySelectorAll(".etext")) {
            const css = getComputedStyle(label);
            if (
              css.visibility === "hidden" ||
              css.display === "none" ||
              css.opacity === "0"
            )
              delete drawn.edges[label.dataset.edge].label;
          }
          const report = check(original, drawn, {
            measureLabel: domMeasurer(player.root),
          });
          const defects = [
            ...report.labels.labels,
            ...report.labels.lines,
            ...report.labels.boxes,
            ...report.steps.labels,
          ].filter((c) => c.band === "defect");
          if (defects.length)
            errors.push(`${name}: ${JSON.stringify(defects)}`);
          for (const field of ["nodes", "lanes", "frames", "viewBox"])
            if (
              JSON.stringify(player.map[field]) !==
              JSON.stringify(original[field])
            )
              errors.push(`${name}: changed ${field}`);
          for (const [id, edge] of Object.entries(original.edges))
            if (player.map.edges[id].path !== edge.path)
              errors.push(`${name}: changed path ${id}`);
          const hidden =
            player.root
              .querySelector("[data-map-edge-labels]")
              .getAttribute("aria-hidden") === "true";
          states.push({
            id: original.id,
            scenario,
            step,
            presentation: hidden ? "panel" : "wide",
            hard: report.hard,
            defects: describeDefects(report),
            lineBoxDefects: report.lines.boxes
              .filter((contact) => contact.band === "defect")
              .map(({ a, b }) => [a, b].sort())
              .sort(),
          });
          const rows = [...player.root.querySelectorAll(".arrow-labels li")];
          if (hidden) {
            const expected = story.steps.flatMap((s, i) =>
              step === "all" || step === i
                ? s.edges.flatMap((id) =>
                    original.edges[id].label?.text
                      ? [{ step: i + 1, text: original.edges[id].label.text }]
                      : [],
                  )
                : [],
            );
            const actual = rows.map((row) => ({
              step: Number(row.querySelector(".n").textContent),
              text: row.querySelector(".label").textContent,
            }));
            // Fixtures' arrow labels are plain text; rich marks have their own browser case.
            if (JSON.stringify(actual) !== JSON.stringify(expected))
              errors.push(`${name}: panel order/content`);
          } else if (rows.length) errors.push(`${name}: duplicate labels`);
          if (document.documentElement.scrollWidth > innerWidth)
            errors.push(`${name}: horizontal overflow`);
        }
      }
      player.destroy();
    }
    return { errors, states };
  }, maps);
}
