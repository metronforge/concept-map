import { expect, it } from "vitest";
import { resolvedFixture } from "./fixtures/map";
import { check } from "../../src/layout/stages/report";
import { labelsInPanel } from "../../src/layout/stages/presentation";
import { derive } from "../../src/model/frame";
import { initialState } from "../../src/model/state";
import { renderPanelParts } from "../../src/render/panel";
import { renderSvg } from "../../src/render/svg";

it("moves labels only for hard arrow-label contacts", () => {
  const map = resolvedFixture();
  map.edges.ab.label = { text: "go", at: [30, 80] };
  const clean = check(map, map);
  for (const field of ["labels", "lines", "boxes"] as const) {
    const report = structuredClone(clean);
    report.labels = { labels: [], lines: [], boxes: [] };
    report.steps.labels = [];
    report.labels[field] = [
      { a: "label:ab", b: "line:ab", band: "tight", gap: 0 },
    ];
    expect(labelsInPanel(map, report)).toBe(false);
    report.labels[field][0].band = "defect";
    expect(labelsInPanel(map, report)).toBe(true);
  }
  clean.labels = { labels: [], lines: [], boxes: [] };
  clean.steps.labels = [
    { a: "label:ab", b: "step:ab", band: "defect", gap: -1 },
  ];
  expect(labelsInPanel(map, clean)).toBe(true);
  clean.steps.labels = [];
  clean.hard = 100;
  expect(labelsInPanel(map, clean)).toBe(false);
  delete map.edges.ab.label;
  expect(labelsInPanel(map, check(map, map))).toBe(false);
});

function labelledMap() {
  const map = resolvedFixture();
  map.edges.ab.label = {
    text: "Use `code` and *care* with **bold** <img>",
    at: [80, 70],
  };
  map.edges.ba = { ...map.edges.ab, label: { text: "Return", at: [80, 80] } };
  map.scenarios[0].steps[0].edges = [
    "ba",
    "ab",
  ] as (typeof map.scenarios)[number]["steps"][number]["edges"];
  return map;
}

it("puts ordered inline labels after the explanation and before navigation", () => {
  const map = labelledMap();
  const frame = derive(map, initialState, { labelsInPanel: true });
  const panel = renderPanelParts(map, frame);
  expect(frame.panel.arrowLabels).toEqual([
    { step: 1, text: "Return" },
    { step: 1, text: "Use `code` and *care* with **bold** <img>" },
  ]);
  expect(panel.head).toContain(
    "<code>code</code> and <em>care</em> with <strong>bold</strong> &lt;img&gt;",
  );
  expect(panel.head.indexOf("Start here")).toBeLessThan(
    panel.head.indexOf("Return"),
  );
  expect(panel.head.indexOf("Return")).toBeLessThan(
    panel.head.indexOf("<code>code"),
  );
  expect(panel.head.indexOf("<code>code")).toBeLessThan(
    panel.head.indexOf('class="stepper"'),
  );
  expect(renderSvg(map, { frame })).toContain(
    'data-map-edge-labels visibility="hidden" aria-hidden="true"',
  );
  expect(renderSvg(map)).not.toContain(
    'data-map-edge-labels visibility="hidden"',
  );
});

it("lists repeated arrows beside each whole-map step that uses them", () => {
  const map = labelledMap();
  const frame = derive(
    map,
    { ...initialState, mode: "all" },
    { labelsInPanel: true },
  );
  expect(
    frame.panel.arrowLabels?.map(({ step, text }) => [step, text]),
  ).toEqual([
    [1, "Return"],
    [1, "Use `code` and *care* with **bold** <img>"],
    [2, "Use `code` and *care* with **bold** <img>"],
  ]);
  const { head, more } = renderPanelParts(map, frame);
  expect(head).not.toContain('class="arrow-labels"');
  expect(more.match(/<code>code<\/code>/g)).toHaveLength(2);
  expect(more.indexOf("Return")).toBeLessThan(more.indexOf('data-li="1"'));
  expect(renderPanelParts(map, derive(map, initialState)).head).not.toContain(
    'class="arrow-labels"',
  );
});

it("moves labels covered by a node's step number", () => {
  const map = resolvedFixture();
  map.scenarios[0].display.nodeBadges = true;
  map.scenarios[0].repeatBadges = [];
  map.edges.ab.label = { text: "go", at: [61, 18] };
  const report = check(map, map);
  expect(report.steps.labels).toContainEqual(
    expect.objectContaining({ a: "label:ab", band: "defect" }),
  );
  expect(labelsInPanel(map, report)).toBe(true);
  expect(report.steps.boxes).toEqual([]);
});
