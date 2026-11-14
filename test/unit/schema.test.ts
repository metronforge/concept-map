import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  AuthoredMapSchema,
  mapWarnings,
} from "../../src/components/map/authored-schema";
import { ResolvedMapSchema } from "../../src/lib/concept-map/schema";
import { authoredFixture } from "./fixtures/map";

function messages(value: unknown) {
  const result = AuthoredMapSchema.safeParse(value);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
}

test("valid fixture parses without warnings; defaults are explicit", () => {
  const map = AuthoredMapSchema.parse(authoredFixture());
  expect(mapWarnings(map)).toEqual([]);
  expect(map.scenarios[0].display).toEqual({
    counterLabel: true,
    edges: "progressive",
    edgeBadges: true,
    nodeBadges: false,
    log: "incremental",
  });
});

describe("one independent fixture per validation rule", () => {
  test("E1 node/frame namespace", () => {
    const m: any = authoredFixture();
    m.frames.a = m.frames.outer;
    expect(messages(m)).toEqual(["E1: node and frame share id a"]);
  });
  test("E2 references", () => {
    const m: any = authoredFixture();
    m.nodes.a.lane = "missing";
    expect(messages(m)).toEqual(["E2: unknown lane missing"]);
  });
  test("E3 scenario ids", () => {
    const m: any = authoredFixture();
    m.scenarios.push(structuredClone(m.scenarios[0]));
    expect(messages(m)).toEqual(["E3: duplicate scenario normal"]);
  });
  test("E3 step ids", () => {
    const m: any = authoredFixture();
    m.scenarios[0].steps.push(structuredClone(m.scenarios[0].steps[1]));
    expect(messages(m)).toEqual(["E3: duplicate step end in normal"]);
  });
  test("E4 hops cannot go back", () => {
    const m: any = authoredFixture();
    m.scenarios[0].flow.push({ node: "a", step: "start", log: [] });
    expect(messages(m)).toEqual(["E4: hop steps go back in normal"]);
  });
  test("E5 repeat badge edge belongs to step", () => {
    const m: any = authoredFixture();
    m.scenarios[0].repeatBadges[0].step = "start";
    expect(messages(m)).toEqual(["E5: repeat badge ab is not in normal/start"]);
  });
  test("E6 source and deeper required", () => {
    const m: any = authoredFixture();
    m.scenarios[0].steps[0].sources = [];
    m.scenarios[0].steps[0].deeper = [];
    expect(messages(m)).toEqual([
      "E6: step normal/start needs a source",
      "E6: step normal/start needs a deeper spread",
    ]);
  });
  test("E7 hop arrival", () => {
    const m: any = authoredFixture();
    m.scenarios[0].flow[1].node = "a";
    expect(messages(m)).toEqual(["E7: hop on ab must arrive at b"]);
  });
  test("W1 is returned, never thrown", () => {
    const m: any = authoredFixture();
    m.nodes.a.box[0] = -1;
    const parsed = AuthoredMapSchema.parse(m);
    expect(mapWarnings(parsed)).toEqual([
      {
        rule: "W1",
        path: "nodes.a.box",
        message: "box extends beyond viewBox",
      },
    ]);
  });
  test("W2 current includes an unrevealed node", () => {
    const m: any = authoredFixture();
    m.scenarios[0].steps[0].current = ["b"];
    const parsed = AuthoredMapSchema.parse(m);
    expect(mapWarnings(parsed)).toEqual([
      {
        rule: "W2",
        path: "scenarios.normal.steps.start.current",
        message: "current node b is not revealed",
      },
    ]);
  });
});

test("all reference fields are checked with an identifying path", () => {
  const cases: [string, (m: any) => void][] = [
    ["edge", (m) => (m.edges.ab.from = "missing")],
    ["node", (m) => (m.frames.outer.showWith = ["missing"])],
    ["node", (m) => (m.scenarios[0].steps[0].show = ["missing"])],
    ["node", (m) => (m.scenarios[0].steps[0].current = ["missing"])],
    ["edge", (m) => (m.scenarios[0].steps[0].edges = ["missing"])],
    ["definition", (m) => (m.scenarios[0].steps[0].defs = ["missing"])],
    ["code", (m) => (m.scenarios[0].steps[0].code = "missing")],
    ["node", (m) => (m.scenarios[0].flow[0].node = "missing")],
    ["edge", (m) => (m.scenarios[0].flow[1].edge = "missing")],
    ["step", (m) => (m.scenarios[0].flow[0].step = "missing")],
    ["edge", (m) => (m.scenarios[0].repeatBadges[0].edge = "missing")],
    ["step", (m) => (m.scenarios[0].repeatBadges[0].step = "missing")],
    ["definition", (m) => (m.concepts[0].items[0].definition = "missing")],
    ["node", (m) => (m.concepts[0].items[0].nodes = ["missing"])],
    ["step", (m) => (m.concepts[0].items[0].step.step = "missing")],
    ["scenario", (m) => (m.concepts[0].items[0].step.scenario = "missing")],
    ["scenario", (m) => (m.conceptScenario = "missing")],
    ["node", (m) => (m.callouts[1] = ["missing"])],
    ["node", (m) => (m.scenarios[0].nodeLabels = { missing: "bad" })],
  ];
  for (const [kind, edit] of cases) {
    const m: any = authoredFixture();
    edit(m);
    const result = AuthoredMapSchema.safeParse(m);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(
        result.error.issues.some(
          (i) =>
            i.message.includes(`E2: unknown ${kind} missing`) &&
            i.path.length > 0,
        ),
      ).toBe(true);
  }
});

test("structural errors reject versions, ids, dimensions and invalid source ranges", () => {
  for (const edit of [
    (m: any) => (m.format = 1),
    (m: any) => (m.nodes["bad id"] = m.nodes.a),
    (m: any) => (m.nodes.a.box[2] = 0),
    (m: any) => (m.scenarios = []),
    (m: any) => (m.scenarios[0].steps = []),
    (m: any) => (m.scenarios[0].steps[0].sources[0].lines = [3, 2]),
    (m: any) => (m.scenarios[0].steps[0].sources[0].file = "../outside.ts"),
  ]) {
    const m: any = authoredFixture();
    edit(m);
    expect(AuthoredMapSchema.safeParse(m).success).toBe(false);
  }
});

test("resolved leaves use URLs and page links, root deeper has no spread wrapper", () => {
  const m: any = authoredFixture();
  m.deeper = [{ title: "Page", href: "/page/", why: "Learn" }];
  for (const s of m.scenarios[0].steps) {
    s.sources = [{ label: "source", url: "https://example.com/a.ts#L1-L2" }];
    s.deeper = [{ title: "Page", href: "/page/" }];
  }
  m.concepts[0].items[0].source = {
    label: "source",
    url: "https://example.com/a.ts#L1-L2",
  };
  expect(ResolvedMapSchema.safeParse(m).success).toBe(true);
});

test("committed JSON schema equals the generated schema", () => {
  const generated = z.toJSONSchema(AuthoredMapSchema, {
    target: "draft-2020-12",
  });
  expect(
    JSON.parse(
      readFileSync(
        new URL(
          "../../research/map-player/authored-map.schema.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  ).toEqual(generated);
});

test("frame edge ends and reverse arrivals are valid, lanes have their own namespace", () => {
  const m: any = authoredFixture();
  m.edges.ab = { ...m.edges.ab, from: "a", to: "outer" };
  m.scenarios[0].flow[1] = {
    edge: "ab",
    reverse: true,
    node: "a",
    step: "end",
    log: [],
  };
  m.lanes.a = m.lanes.client;
  expect(messages(m)).toEqual([]);
  m.scenarios[0].flow[1].node = "b";
  expect(messages(m)).toEqual(["E7: hop on ab must arrive at a"]);
});

test("W1 checks lanes and frames as well as nodes", () => {
  const m: any = authoredFixture();
  m.frames.outer.box[2] = 201;
  m.lanes.client.h = 201;
  expect(mapWarnings(AuthoredMapSchema.parse(m))).toEqual([
    {
      rule: "W1",
      path: "frames.outer.box",
      message: "box extends beyond viewBox",
    },
    { rule: "W1", path: "lanes.client", message: "box extends beyond viewBox" },
  ]);
});

test("W2 includes nodes revealed by earlier steps", () => {
  const m: any = authoredFixture();
  m.scenarios[0].steps[1].current = ["a", "b"];
  expect(mapWarnings(AuthoredMapSchema.parse(m))).toEqual([]);
});
