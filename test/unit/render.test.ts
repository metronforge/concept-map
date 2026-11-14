import { parse, stringify } from "yaml";
import { authoredFixture } from "./fixtures/map";
import { expect, test } from "vitest";
import { test as property, fc } from "@fast-check/vitest";
import {
  renderInline,
  escapeHtml,
  escapeMarks,
} from "../../src/lib/concept-map/render/inline";
import { renderSvg } from "../../src/lib/concept-map/render/svg";
import {
  renderPanel,
  statusText,
} from "../../src/lib/concept-map/render/panel";
import {
  renderConcepts,
  renderDeeper,
} from "../../src/lib/concept-map/render/concepts";
import { derive } from "../../src/lib/concept-map/model/frame";
import { initialState } from "../../src/lib/concept-map/model/state";
import { handMaps, resolvedFixture } from "./arbitraries/map";
const unicode = fc.string({ unit: "binary", maxLength: 100 });
/** Decode just our renderer's four entities, after removing its allowed tags. */
function text(html: string) {
  return html
    .replace(/<\/?(?:code|em|strong)>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}
property.prop([unicode])(
  "literal Unicode survives marks escaping and cannot create tags",
  (input) => {
    const html = renderInline(escapeMarks(input));
    expect(text(html)).toBe(input);
    expect(html).not.toMatch(/<[^>]*>/);
  },
);
property.prop([
  unicode,
  fc.string({ unit: "binary", minLength: 1, maxLength: 100 }),
  fc.string({ unit: "binary", minLength: 1, maxLength: 100 }),
  unicode.map((s) => s.replaceAll("`", "'")),
])(
  "code, emphasis and strong preserve their full Unicode content",
  (plain, strong, em, code) => {
    const authored = `${escapeMarks(plain)}\n**${escapeMarks(strong)}**\n*${escapeMarks(em)}*\n\`${code}\``;
    const html = renderInline(authored);
    expect(text(html)).toBe(`${plain}\n${strong}\n${em}\n${code}`);
    expect(html.replace(/<\/?(?:code|em|strong)>/g, "")).not.toContain("<");
  },
);
test("inline examples, nesting, unmatched delimiters and literal builtin", () => {
  expect(renderInline("**strong *em* end** and `*literal*\\x` <builtin>")).toBe(
    "<strong>strong <em>em</em> end</strong> and <code>*literal*\\x</code> &lt;builtin&gt;",
  );
  expect(renderInline("*em **strong** end*")).toBe(
    "<em>em <strong>strong</strong> end</em>",
  );
  expect(renderInline("unclosed `code **strong")).toBe(
    "unclosed `code **strong",
  );
  expect(renderInline("\\*literal\\* \\` \\\\ \\x")).toBe("*literal* ` \\ \\x");
  expect(renderInline('<img src="x" onerror="fail()">')).toBe(
    "&lt;img src=&quot;x&quot; onerror=&quot;fail()&quot;&gt;",
  );
});
property.prop([unicode])(
  "SVG attributes, labels and panel plain text escape untrusted strings",
  (value) => {
    const m = resolvedFixture(),
      unsafe = `<"&${value}`;
    m.title = unsafe;
    m.nodes.a.label = unsafe;
    m.nodes.a.tag = unsafe;
    m.lanes.client.label = unsafe;
    m.frames.outer.label = unsafe;
    m.edges.ab.path = unsafe;
    m.callouts[unsafe] = ["a"];
    m.edges.ab.label = { at: [50, 60], text: unsafe };
    const svg = renderSvg(m);
    expect(svg).toContain(escapeHtml(unsafe));
    expect(svg).not.toContain(unsafe);
    m.scenarios[0].label = unsafe;
    m.definitions.call.term = unsafe;
    m.scenarios[0].steps[0].sources[0].label = unsafe;
    m.scenarios[0].steps[0].sources[0].url = unsafe;
    m.scenarios[0].steps[0].deeper[0].title = unsafe;
    m.scenarios[0].steps[0].deeper[0].href = unsafe;
    m.scenarios[0].steps[0].title = unsafe;
    m.code.call.title = unsafe;
    m.code.call.lines = [unsafe];
    m.scenarios[0].steps[0].text = renderInline(escapeMarks(unsafe));
    const panel = renderPanel(m, derive(m, initialState));
    expect(panel).toContain(escapeHtml(unsafe));
    expect(panel).not.toContain(unsafe);
  },
);
test("SVG starts with initial frame classes, stable group order and permanent callouts", () => {
  const m = resolvedFixture(),
    svg = renderSvg(m);
  expect(svg).toContain('data-node="a"');
  expect(svg).toContain('class="node cur"');
  expect(svg).toContain('class="node ghost"');
  expect(svg).toContain('data-edge="ab"');
  expect(svg).toContain('data-callout="1"');
  const indexes = [
    "data-map-layers",
    "data-map-edges",
    "data-map-nodes",
    "data-map-edge-labels",
    "data-map-badges",
    "data-map-token",
    "data-map-callouts",
  ].map((s) => svg.indexOf(s));
  expect(indexes.every((i) => i >= 0)).toBe(true);
  expect(indexes).toEqual(indexes.slice().sort((a, b) => a - b));
});
test("panel markup keeps step details before controls, all-step list before flow log", () => {
  const m = resolvedFixture();
  m.scenarios[0].steps[1].log = ["step call"];
  m.scenarios[0].steps[1].code = "call";
  m.scenarios[0].steps[1].fix = "fix";
  const panel = renderPanel(
    m,
    derive(m, { scenario: 0, step: 1, mode: "step" }),
  );
  const indexes = [
    'class="log"',
    'class="fix"',
    'class="code"',
    'class="refs"',
    'class="stepper"',
  ].map((s) => panel.indexOf(s));
  expect(indexes.every((i) => i >= 0)).toBe(true);
  expect(indexes).toEqual(indexes.slice().sort((a, b) => a - b));
  expect(panel).toContain('data-role="back"');
  expect(panel).toContain('aria-current="step"');
  const all = renderPanel(m, derive(m, { scenario: 0, step: 0, mode: "all" }));
  expect(all.indexOf('class="all"')).toBeLessThan(
    all.indexOf('data-role="flowlog"'),
  );
  expect(all).toContain('data-go="1"');
});
test("panel controls are real buttons; the live status carries only count and title", () => {
  const [, m] = handMaps();
  const last = m.scenarios[0].steps.length - 1;
  const frame = derive(m, { scenario: 0, step: last, mode: "step" });
  const panel = renderPanel(m, frame);
  expect(panel).toMatch(
    /<button type="button"[^>]*data-role="nextscenario">Short<\/button>/,
  );
  expect(panel).not.toContain('href="#"');
  expect(statusText(frame)).toBe(`${frame.panel.count}: ${frame.panel.title}`);
  const all = derive(m, { scenario: 0, step: 0, mode: "all" });
  expect(statusText(all)).toMatch(/^Whole map · /);
});
test("concept rows are not tab stops; their link and button are", () => {
  const html = renderConcepts(resolvedFixture());
  expect(html).toMatch(/<li data-nodes="[^"]*">/);
  expect(html).not.toContain("tabindex");
});
test("concept references resolve stable step ids to numeric DOM positions", () => {
  const m = resolvedFixture();
  expect(renderConcepts(m)).toContain('data-step="0"');
  expect(renderConcepts(m)).toContain('data-nodes="a"');
  expect(renderConcepts(m)).toContain("Step 1");
  expect(renderDeeper(m)).toContain('href="/more/"');
  expect(renderDeeper(m)).toContain("Learn more");
});

property.prop([unicode])(
  "authored YAML survives parse/serialize/parse without changing text",
  (value) => {
    const m = authoredFixture();
    m.title = value;
    m.scenarios[0].steps[0].text = value;
    const first = parse(stringify(m));
    expect(first).toEqual(m);
    expect(parse(stringify(first))).toEqual(first);
  },
);
property.prop([unicode])(
  "concept and deeper renderers escape plain labels and attributes",
  (value) => {
    const m = resolvedFixture(),
      unsafe = `<"&${value}`;
    m.concepts[0].label = unsafe;
    m.definitions.call.term = unsafe;
    m.concepts[0].items[0].source = { label: unsafe, url: unsafe };
    m.concepts[0].items[0].short = renderInline(escapeMarks(unsafe));
    m.deeper[0] = {
      title: unsafe,
      href: unsafe,
      why: renderInline(escapeMarks(unsafe)),
    };
    for (const html of [renderConcepts(m), renderDeeper(m)]) {
      expect(html).toContain(escapeHtml(unsafe));
      expect(html).not.toContain(unsafe);
    }
  },
);
