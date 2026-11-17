import { SourceMapSchema } from "../../src/schema";
import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { layout, check, describeDefects } from "../../src/layout/index";
import { dagreEngine } from "../../src/layout/dagre";
import { elkEngine } from "../../src/layout/elk";

for (const width of [1280, 390])
  for (const name of ["coffee", "door", "gcd"])
    for (const engine of ["dagre", "elk"] as const)
      test(`${name} ${engine} ${width}px: the checker judges the map drawn after fonts load`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({
          reducedMotion: "reduce",
          colorScheme: "light",
        });
        const source = SourceMapSchema.parse(
          JSON.parse(readFileSync(`examples/${name}/map.json`, "utf8")),
        );
        const original = await layout(
          source,
          engine === "dagre" ? dagreEngine : elkEngine,
        );
        await page.goto("/integration/");
        await page.addStyleTag({ path: "css/concept-map.css" });
        const result = await page.evaluate(
          async ({ source, original }) => {
            const { mount, check, domMeasurer, derive } =
              await import("/assets/integration.js");
            document.body.replaceChildren();
            const host = document.createElement("div");
            host.style.width = "100%";
            host.style.containerType = "inline-size";
            document.body.append(host);
            const player = mount(host, original, { reducedMotion: true });
            await document.fonts.ready;
            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
            const drawn = player.map;
            const measurer = domMeasurer(player.root);
            const report = check(source, drawn, { measureLabel: measurer });
            const mismatches: string[] = [];
            for (
              let scenario = 0;
              scenario < drawn.scenarios.length;
              scenario++
            ) {
              player.dispatch({ type: "scenario", index: scenario });
              for (const step of [
                ...drawn.scenarios[scenario].steps.keys(),
                "all",
              ]) {
                player.dispatch(
                  step === "all"
                    ? { type: "mode", mode: "all" }
                    : { type: "go", step },
                );
                const frame = derive(drawn, player.state);
                const badges = [
                  ...player.root.querySelectorAll(".badge circle"),
                ].map((e) => [
                  Number(e.getAttribute("cx")),
                  Number(e.getAttribute("cy")),
                ]);
                if (
                  JSON.stringify(badges) !==
                  JSON.stringify(frame.badges.map((b) => [b.x, b.y]))
                )
                  mismatches.push(`${scenario}:${step}:badges`);
                for (const label of player.root.querySelectorAll(".etext")) {
                  const at = drawn.edges[label.dataset.edge].label.at;
                  if (
                    +label.getAttribute("x") !== at[0] ||
                    +label.getAttribute("y") !== at[1]
                  )
                    mismatches.push(`${scenario}:${step}:label`);
                }
                if (
                  JSON.stringify(
                    check(source, player.map, { measureLabel: measurer }),
                  ) !== JSON.stringify(report)
                )
                  mismatches.push(`${scenario}:${step}:report`);
              }
            }
            return {
              drawn,
              report,
              mismatches,
              fits:
                player.root.querySelector(".map svg")!.getBoundingClientRect()
                  .width <= host.clientWidth,
              arrowFill: getComputedStyle(
                player.root.querySelector(".edge path")!,
              ).fill,
            };
          },
          { source, original },
        );
        expect(result.drawn.measurement?.name).toBe("dom");
        expect(result.mismatches).toEqual([]);
        expect(result.arrowFill).toBe("none");
        expect(result.fits).toBe(true);
        for (const field of ["nodes", "lanes", "frames", "viewBox"] as const)
          expect(result.drawn[field]).toEqual(original[field]);
        const defects = describeDefects(result.report).map((line) =>
          line.replace(/ \([^)]* em\)$/, ""),
        );
        const evidence = {
          viewport: width,
          report: result.report,
          measurement: result.drawn.measurement,
          defects,
          serverHard: check(source, original).hard,
          moved: Object.keys(original.edges).flatMap((id) => {
            const a = original.edges[id],
              b = result.drawn.edges[id];
            return [
              ...(JSON.stringify(a.label?.at) !== JSON.stringify(b.label?.at)
                ? [`label:${id}`]
                : []),
              ...(JSON.stringify(a.badge) !== JSON.stringify(b.badge)
                ? [`step:${id}`]
                : []),
            ];
          }),
        };
        for (const [scenario, story] of original.scenarios.entries())
          for (const [index, badge] of (story.repeatBadges ?? []).entries())
            if (
              JSON.stringify(badge.at) !==
              JSON.stringify(
                result.drawn.scenarios[scenario].repeatBadges![index].at,
              )
            )
              evidence.moved.push(`repeat:${scenario}:${badge.step}`);
        await info.attach("font-report", {
          body: JSON.stringify(evidence, null, 2),
          contentType: "application/json",
        });
        if (process.env.FONT_EVIDENCE_DIR) {
          mkdirSync(process.env.FONT_EVIDENCE_DIR, { recursive: true });
          writeFileSync(
            `${process.env.FONT_EVIDENCE_DIR}/${info.project.name}-${name}-${engine}-${width}.json`,
            JSON.stringify(evidence, null, 2) + "\n",
          );
        }
        const reference = JSON.parse(
          readFileSync(
            `docs/evidence/font-measurement/${width === 390 ? "390/" : ""}chromium.json`,
            "utf8",
          ),
        );
        const expected = reference[`${name} ${engine}`];
        expect(defects).toEqual(expected.defects);
        expect(result.report.hard).toBeLessThanOrEqual(
          evidence.serverHard + expected.extraDefects.length,
        );
      });
