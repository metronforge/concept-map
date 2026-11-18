import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ResolvedMapSchema } from "../../src/schema";

test("applying geometry preserves SVG elements and playback decorations", async ({
  page,
}) => {
  const map = ResolvedMapSchema.parse(
    JSON.parse(readFileSync("test/fixtures/map.json", "utf8")),
  );
  map.nodes.a.tag = "tag";
  map.edges.ab.label = { text: "go", at: [80, 70] };
  await page.goto("/integration/");
  const result = await page.evaluate(async (map) => {
    const { renderFigure, SvgDom, derive } =
      await import("/assets/integration.js");
    document.body.innerHTML = renderFigure(map);
    const element = document.querySelector<SVGSVGElement>(".map svg")!;
    const svg = new SvgDom(element);
    const state = { scenario: 0, step: 1, mode: "all" as const };
    svg.applyFrame(derive(map, state));
    svg.nodes.a.classList.add("visit", "hl");
    svg.nodes.b.classList.add("failnow");
    svg.edges.ab.classList.add("trail");
    svg.tokenFailure(true);
    svg.tokens.forEach((token) => {
      token.setAttribute("visibility", "visible");
      token.setAttribute("cx", "35");
      token.setAttribute("cy", "70");
    });
    const animation = svg.tokens[0].animate(
      [{ opacity: 0.5 }, { opacity: 1 }],
      { duration: 10000, fill: "both" },
    );
    animation.pause();
    animation.currentTime = 5000;
    const button =
      document.querySelector<HTMLButtonElement>("[data-role=next]")!;
    button.focus();
    const elements = [...element.querySelectorAll("*")].filter(
      (e) => !e.closest("[data-map-badges]"),
    );
    const marker = element.querySelector("marker")!.id;
    const tokenMarkup = svg.tokens.map((t) => t.outerHTML);
    const classes = [svg.nodes.a, svg.nodes.b, svg.edges.ab].map((e) =>
      e.getAttribute("class"),
    );
    const next = structuredClone(map);
    next.viewBox = [400, 300];
    next.direction = "right";
    next.lanes.client = { ...next.lanes.client, x: 20, y: 30, w: 350, h: 240 };
    next.frames.outer.box = [30, 40, 280, 210];
    next.nodes.a.box = [50, 60, 80, 50];
    next.nodes.b.box = [200, 160, 100, 60];
    next.edges.ab.path = "M90 110 L250 160";
    next.edges.ab.label.at = [135, 130];
    next.edges.ab.badge = [170, 140];
    next.scenarios[0].repeatBadges![0].at = [180, 150];
    svg.applyGeometry(next);
    svg.applyFrame(derive(next, state));
    const attrs = (selector: string, names: string[]) => {
      const el = element.querySelector(selector)!;
      return names.map((name) => el.getAttribute(name));
    };
    const box = (selector: string) =>
      attrs(selector, ["x", "y", "width", "height"]);
    const point = (selector: string) => attrs(selector, ["x", "y"]);
    const changed = {
      viewBox: element.getAttribute("viewBox"),
      nodeA: box('[data-node="a"] rect'),
      nodeB: box('[data-node="b"] rect'),
      textA: point('[data-node="a"] text'),
      tag: point('[data-node="a"] .tag'),
      textB: point('[data-node="b"] text'),
      lane: box(".lane rect"),
      laneText: point(".lane text"),
      frame: box(".frame rect"),
      frameText: point(".frame text"),
      path: attrs(".edge path", ["d"]),
      label: point(".etext"),
      callout: attrs(".callout circle", ["cx", "cy"]),
      calloutText: point(".callout text"),
      badges: [...element.querySelectorAll(".badge circle")].map((e) => [
        e.getAttribute("cx"),
        e.getAttribute("cy"),
      ]),
    };
    const preserved = {
      elements: elements.every((e) => element.contains(e)),
      references: svg.nodes.a === element.querySelector('[data-node="a"]'),
      token:
        JSON.stringify(tokenMarkup) ===
        JSON.stringify(svg.tokens.map((t) => t.outerHTML)),
      animation:
        svg.tokens[0].getAnimations().includes(animation) &&
        animation.currentTime === 5000,
      classes:
        JSON.stringify(classes) ===
        JSON.stringify(
          [svg.nodes.a, svg.nodes.b, svg.edges.ab].map((e) =>
            e.getAttribute("class"),
          ),
        ),
      marker:
        element.querySelector("marker")!.id === marker &&
        element.querySelector(".edge path")!.getAttribute("marker-end") ===
          `url(#${marker})`,
      focus: document.activeElement === button,
    };
    svg.applyGeometry(map);
    svg.applyFrame(derive(map, state));
    const restored = {
      viewBox: element.getAttribute("viewBox"),
      node: box('[data-node="a"] rect'),
      lane: box(".lane rect"),
      laneText: point(".lane text"),
      label: point(".etext"),
      path: attrs(".edge path", ["d"]),
    };
    animation.cancel();
    return { changed, preserved, restored };
  }, map);
  expect(result.changed).toEqual({
    viewBox: "0 0 400 300",
    nodeA: ["50", "60", "80", "50"],
    nodeB: ["200", "160", "100", "60"],
    textA: ["60", "77"],
    tag: ["60", "92"],
    textB: ["210", "194.5"],
    lane: ["20", "30", "350", "240"],
    laneText: ["30", "46"],
    frame: ["30", "40", "280", "210"],
    frameText: ["302", "56"],
    path: ["M90 110 L250 160"],
    label: ["135", "130"],
    callout: ["54", "64"],
    calloutText: ["54", "64.5"],
    badges: [
      ["170", "140"],
      ["180", "150"],
    ],
  });
  expect(Object.values(result.preserved)).toEqual(Array(7).fill(true));
  expect(result.restored).toEqual({
    viewBox: "0 0 200 200",
    node: ["10", "10", "50", "30"],
    lane: ["6", "0", "188", "200"],
    laneText: ["16", "16"],
    label: ["80", "70"],
    path: ["M35 40 V100"],
  });
});
