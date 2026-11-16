import { describe, expect, it } from "vitest";
import { test as property, fc } from "@fast-check/vitest";
import { readFileSync } from "node:fs";
import { ResolvedMapSchema, SourceMapSchema } from "../../../src/schema";
import type { ResolvedMap } from "../../../src/schema";
import {
  check,
  isLayoutDefectsError,
  layout,
  type LayoutReport,
} from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
import { measureLabel } from "../../../src/layout/measure";
import fixture from "../../fixtures/map.json";
import { resolvedMaps } from "../fixtures/maps";

const fixed = () => ({ width: 20, height: 12 });
/** Nodes a [10,10,50,30] and b [10,100,50,30]; arrow ab straight down x = 35. */
function map(change: (m: typeof fixture) => void = () => {}): ResolvedMap {
  const m = structuredClone(fixture);
  m.scenarios[0].repeatBadges = [];
  change(m);
  return ResolvedMapSchema.parse(m);
}
const report = (m: ResolvedMap) => check(m, m, { measureLabel: fixed });

describe("check", () => {
  it("finds nothing on a clean drawing", () => {
    const r = report(map());
    expect(r.hard).toBe(0);
    expect(r.crossings.count).toBe(0);
    expect(r.reading).toEqual({ edges: 1, forward: 1, share: 1 });
    expect(r.text).toEqual({ width: 19.05, height: 19.05 });
  });

  it("bands a label beside, near and over a line", () => {
    // Label box is [x, y - 10, 20, 12]; the line runs at x = 35.
    const at = (x: number) =>
      report(
        map((m) => {
          (m.edges.ab as Record<string, unknown>).label = {
            at: [x, 80],
            text: "go",
          };
        }),
      ).labels.lines;
    expect(at(40)).toEqual([]); // 5 apart: clear (margin 2.625)
    expect(at(37)).toEqual([
      { a: "label:ab", b: "line:ab", band: "tight", gap: 0.19 },
    ]);
    expect(at(30)).toEqual([
      { a: "label:ab", b: "line:ab", band: "defect", gap: -0.476 },
    ]);
  });

  it("reports step numbers over each other and over boxes", () => {
    const r = report(
      map((m) => {
        // The arrow's own number is at [35, 70].
        m.scenarios[0].repeatBadges = [
          { edge: "ab", step: "end", at: [38, 74] },
          { edge: "ab", step: "start", at: [35, 45] },
        ];
      }),
    );
    expect(r.steps.steps).toEqual([
      expect.objectContaining({
        a: "step:ab",
        b: "repeat:0:end",
        band: "defect",
      }),
    ]);
    expect(r.steps.boxes).toEqual([
      expect.objectContaining({
        a: "node:a",
        b: "repeat:0:start",
        band: "defect",
      }),
    ]);
    expect(r.hard).toBe(2);
  });

  it("reports a line over a box it does not connect, and crossings", () => {
    const r = report(
      map((m) => {
        (m.nodes as Record<string, unknown>).c = {
          label: "C",
          layer: "client",
          box: [20, 60, 30, 20],
        };
        (m.edges as Record<string, unknown>).cc = {
          from: "a",
          to: "b",
          path: "M0,70 H70",
        };
      }),
    );
    expect(r.lines.boxes.map((c) => [c.a, c.b, c.band])).toEqual([
      ["node:c", "line:ab", "defect"],
      ["node:c", "line:cc", "defect"],
    ]);
    expect(r.crossings).toEqual({ count: 1, pairs: [["ab", "cc"]] });
  });

  it("counts the reading direction along the first scenario", () => {
    const up = report(
      map((m) => {
        m.nodes.a.box = [10, 100, 50, 30];
        m.nodes.b.box = [10, 10, 50, 30];
        m.edges.ab.path = "M35 100 V40";
      }),
    );
    expect(up.reading).toEqual({ edges: 1, forward: 0, share: 0 });
  });

  it("refuses a resolved map that does not match the source", () => {
    const other = map((m) => {
      m.edges.ab.to = "a";
    });
    expect(() => check(map(), other)).toThrow(/connects different nodes/);
  });
});

/** Every coordinate times k; text measured k times larger. */
function scaled(m: ResolvedMap, k: number): ResolvedMap {
  const c = structuredClone(m);
  const p = ([x, y]: number[]) => [x * k, y * k] as [number, number];
  c.viewBox = [m.viewBox[0] * k, m.viewBox[1] * k];
  for (const [id, lane] of Object.entries(c.lanes)) {
    const original = m.lanes[id];
    lane.x = (original.x ?? 6) * k;
    lane.w = (original.w ?? m.viewBox[0] - 12) * k;
    lane.y *= k;
    lane.h *= k;
  }
  for (const n of Object.values(c.nodes))
    n.box = n.box.map((v) => v * k) as typeof n.box;
  for (const e of Object.values(c.edges)) {
    e.path = e.path.replace(/-?\d+(\.\d+)?/g, (v) => String(Number(v) * k));
    if (e.badge) e.badge = p(e.badge);
    if (e.label) e.label.at = p(e.label.at);
  }
  for (const s of c.scenarios)
    for (const b of s.repeatBadges ?? []) b.at = p(b.at);
  return c;
}

const book = resolvedMaps();
property.prop([fc.constantFrom(...book), fc.constantFrom(0.5, 2, 4)])(
  "scaling a drawing with its text leaves the report unchanged",
  ({ map: m }, k) => {
    expect(check(m, scaled(m, k), { textSize: 10.5 * k })).toEqual(check(m, m));
  },
);

it("gives equal reports for equal input", () => {
  for (const { map: m } of book) expect(check(m, m)).toEqual(check(m, m));
});

const recorded = (file: string) =>
  JSON.parse(
    readFileSync(`docs/evidence/quality-baseline/${file}`, "utf8"),
  ) as Record<string, LayoutReport>;
const example = (name: string) =>
  SourceMapSchema.parse(
    JSON.parse(readFileSync(`examples/${name}/map.json`, "utf8")),
  );

describe("recorded baseline", () => {
  it("matches the hand-drawn book maps", () => {
    expect(
      Object.fromEntries(book.map(({ id, map: m }) => [id, check(m, m)])),
    ).toEqual(recorded("book.json"));
  });
  it("matches the examples laid out by each engine", async () => {
    const reports: Record<string, LayoutReport> = {};
    for (const name of ["coffee", "door", "gcd"])
      for (const [id, engine] of [
        ["dagre", dagreEngine],
        ["elk", elkEngine],
      ] as const)
        reports[`${name} ${id}`] = check(
          example(name),
          await layout(example(name), engine),
        );
    expect(reports).toEqual(recorded("examples.json"));
  });
});

describe("strict layout", () => {
  const source = example;
  it("passes a clean layout through", async () => {
    await expect(
      layout(source("coffee"), elkEngine, { strict: true }),
    ).resolves.toBeDefined();
  });
  it("throws the report when a drawing has hard defects", async () => {
    const error = await layout(source("gcd"), dagreEngine, {
      strict: true,
    }).catch((e: unknown) => e);
    expect(isLayoutDefectsError(error)).toBe(true);
    if (!isLayoutDefectsError(error)) return;
    expect(error.report.hard).toBeGreaterThan(0);
    expect(error.message).toMatch(
      /step numbers overlap: step:loop and repeat:0:turn-1/,
    );
  });
  it("checks hand-drawn maps too", async () => {
    const hand = book.find(({ id }) => id === "2-3")!.map;
    await expect(
      layout(hand, dagreEngine, { strict: true, measureLabel }),
    ).rejects.toThrow(/step number covers a box/);
  });
});
