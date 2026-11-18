import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ResolvedMapSchema } from "../../src/schema";

for (const candidate of ["clean", "wrapped", "line defect", "absent"] as const)
  test(`real-font candidate selection: ${candidate}`, async ({ page }) => {
    const wide = ResolvedMapSchema.parse(
      JSON.parse(readFileSync("test/fixtures/map.json", "utf8")),
    );
    wide.lanes = {};
    wide.frames = {};
    for (const node of Object.values(wide.nodes)) delete node.lane;
    wide.scenarios[0].repeatBadges = [];
    wide.viewBox = [1200, 200];
    wide.nodes.a.box = [0, 0, 1200, 88];
    wide.nodes.b.box = [0, 112, 1200, 88];
    wide.edges.ab.path = "M35 88 V112";
    wide.edges.ab.label = { text: "go", at: [65, 104] };
    const narrow = structuredClone(wide);
    narrow.viewBox = [300, 400];
    narrow.nodes.a.box = [0, 0, 300, 50];
    narrow.nodes.b.box = [0, 350, 300, 50];
    narrow.edges.ab.path = "M35 50 V350";
    narrow.edges.ab.label = { text: "go", at: [70, 200] };
    if (candidate === "wrapped") {
      wide.edges.ab.label.text = narrow.edges.ab.label.text =
        "first second third fourth";
      narrow.edges.ab.label.at = [260, 200];
    }
    if (candidate === "line defect") {
      wide.nodes.c = { ...wide.nodes.a, label: "C", box: [750, 0, 40, 40] };
      narrow.nodes.c = { ...wide.nodes.c, box: [20, 240, 40, 40] };
    }
    await page.goto("/integration/");
    await page.addStyleTag({ path: "css/concept-map.css" });
    const result = await page.evaluate(
      async ({ wide, narrow, candidate }) => {
        const {
          renderFigure,
          SvgDom,
          geometry,
          refineDrawing,
          check,
          domMeasurer,
        } = await import("/assets/integration.js");
        document.body.replaceChildren();
        const host = document.createElement("div");
        host.style.width = "390px";
        host.style.containerType = "inline-size";
        document.body.append(host);
        host.innerHTML = renderFigure(wide);
        const root = host.firstElementChild as HTMLElement;
        root.style.margin = "0";
        root.style.display = "block";
        const svg = new SvgDom(root.querySelector("svg")!);
        const geo = geometry(svg.svg);
        const state = { scenario: 0, step: 1, mode: "step" as const };
        const before = JSON.stringify({ wide, narrow, state });
        const node = svg.nodes.a;
        const token = svg.tokens[0];
        const button =
          root.querySelector<HTMLButtonElement>("[data-role=next]")!;
        button.focus();
        await document.fonts.ready;
        const sample = (width: number, switchedAt?: number) => {
          host.style.width = `${width}px`;
          const result = refineDrawing(
            root,
            wide,
            geo,
            svg,
            state,
            switchedAt,
            candidate === "absent" ? undefined : narrow,
          );
          const report = check(wide, result.map, {
            measureLabel: domMeasurer(root),
          });
          return {
            choice: result.choice,
            linesOfText: [...svg.labels.ab.querySelectorAll("tspan")].map(
              (line) => line.textContent,
            ),
            hard: report.hard,
            lines: report.lines.boxes.filter((c) => c.band === "defect"),
            viewBox: result.map.viewBox,
            svgViewBox: svg.svg.getAttribute("viewBox"),
            path: svg.edges.ab.querySelector("path")!.getAttribute("d"),
            panel:
              root
                .querySelector("[data-map-edge-labels]")!
                .getAttribute("visibility") === "hidden",
            measurement: result.map.measurement,
          };
        };
        const probe = refineDrawing(root, narrow, geo, svg, state);
        const candidateReport = check(wide, probe.map, {
          measureLabel: domMeasurer(root),
        });
        const small = sample(390);
        const repeated = sample(390, small.choice.switchedAt);
        const large = sample(2000, repeated.choice.switchedAt);
        const again = sample(390, large.choice.switchedAt);
        return {
          candidateReport,
          small,
          repeated,
          large,
          again,
          unchanged: before === JSON.stringify({ wide, narrow, state }),
          elements:
            node === svg.nodes.a &&
            token === svg.tokens[0] &&
            node.isConnected &&
            token.isConnected,
          focused: document.activeElement === button,
        };
      },
      { wide, narrow, candidate },
    );
    if (candidate === "line defect") {
      expect(result.candidateReport.hard).toBe(1);
      expect(result.candidateReport.lines.boxes).toEqual([
        expect.objectContaining({ a: "node:c", b: "line:ab", band: "defect" }),
      ]);
    } else expect(result.candidateReport.hard).toBe(0);
    expect(result.unchanged).toBe(true);
    expect(result.elements).toBe(true);
    expect(result.focused).toBe(true);
    expect(result.repeated).toEqual(result.small);
    expect(result.again).toEqual(result.small);
    expect(result.large.choice.presentation).toBe("wide");
    expect(result.large.choice.switchedAt).toBeUndefined();
    expect(result.large.viewBox).toEqual(wide.viewBox);
    expect(result.large.path).toBe(wide.edges.ab.path);
    expect(result.large.panel).toBe(false);
    expect(result.large.linesOfText).toEqual([]);
    if (candidate === "wrapped")
      expect(result.small.linesOfText).toEqual([
        "first ",
        "second ",
        "third ",
        "fourth",
      ]);
    if (candidate === "clean" || candidate === "wrapped") {
      expect(result.small.choice.presentation).toBe("narrow");
      expect(result.small.hard).toBe(0);
      expect(result.small.viewBox).toEqual(narrow.viewBox);
      expect(result.small.svgViewBox).toBe("0 0 300 400");
      expect(result.small.path).toBe(narrow.edges.ab.path);
      expect(result.small.panel).toBe(false);
      expect(result.small.measurement?.name).toBe("dom");
    } else {
      expect(result.small.choice.presentation).toBe("panel");
      expect(result.small.viewBox).toEqual(wide.viewBox);
      expect(result.small.path).toBe(wide.edges.ab.path);
      expect(result.small.panel).toBe(true);
    }
  });
