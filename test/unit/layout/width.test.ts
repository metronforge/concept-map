import { expect, test, vi } from "vitest";
import {
  layout,
  check,
  measureLabel,
  LayoutDefectsError,
} from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
import { ResolvedMapSchema } from "../../../src/schema";
import { sourceFixture } from "./fixture";
import fixture from "../../fixtures/map.json";

for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const) {
  test(`${name}: a fitting width retains the entire default drawing`, async () => {
    const source = sourceFixture();
    const wide = await layout(source, engine);
    expect(
      await layout(source, engine, { widthEm: wide.viewBox[0] / 10.5 }),
    ).toEqual(wide);
  });

  test(`${name}: reserves enlarged text and refines at the returned width`, async () => {
    const source = sourceFixture();
    source.edges.ab.label = "orders coffee";
    source.nodes.a.label = "First node";
    const before = structuredClone(source);
    const wide = await layout(source, engine);
    const widthEm = wide.viewBox[0] / 21;
    const observed = { layout: vi.fn(engine.layout.bind(engine)) };
    const narrow = await layout(source, observed, { widthEm });
    expect(observed.layout).toHaveBeenCalledTimes(2);
    expect(narrow.nodes.a.box[2]).toBeGreaterThan(wide.nodes.a.box[2]);
    expect(narrow.measurement?.labels.ab).toEqual(
      measureLabel(source.edges.ab.label, {
        fontSize: Math.max(10.5, narrow.viewBox[0] / widthEm),
        mono: true,
      }),
    );
    expect(ResolvedMapSchema.safeParse(narrow).success).toBe(true);
    expect(source).toEqual(before);
    expect(await layout(source, engine, { widthEm })).toEqual(narrow);
  });
}

test.each([0, -1, NaN, Infinity, -Infinity])(
  "rejects invalid width %s before measurement or engine execution",
  async (widthEm) => {
    const engine = { layout: vi.fn() };
    const measure = vi.fn();
    await expect(
      layout(sourceFixture(), engine, { widthEm, measureLabel: measure }),
    ).rejects.toThrow("widthEm must be a finite positive number");
    expect(engine.layout).not.toHaveBeenCalled();
    expect(measure).not.toHaveBeenCalled();
  },
);

test("a width never re-lays out a hand drawing", async () => {
  const engine = { layout: vi.fn() };
  const measure = vi.fn();
  expect(
    await layout(fixture, engine, { widthEm: 12, measureLabel: measure }),
  ).toEqual(ResolvedMapSchema.parse(fixture));
  expect(engine.layout).not.toHaveBeenCalled();
  expect(measure).not.toHaveBeenCalled();
});

test("keeps custom measurement names, receivers and ink offsets", async () => {
  const source = sourceFixture();
  source.edges.ab.label = "go";
  const measurer = {
    name: "custom ink",
    measure(text: string, style: { fontSize: number; mono: boolean }) {
      expect(this).toBe(measurer);
      return {
        ...measureLabel(text, style),
        left: -style.fontSize / 10,
        ascent: style.fontSize,
      };
    },
  };
  const narrow = await layout(source, dagreEngine, {
    widthEm: 6,
    measureLabel: measurer,
  });
  expect(narrow.measurement?.name).toBe(measurer.name);
  expect(narrow.measurement?.labels.ab.left).toBeCloseTo(
    -narrow.viewBox[0] / 60,
  );
  expect(narrow.measurement?.labels.ab.ascent).toBeCloseTo(
    narrow.viewBox[0] / 6,
  );
});

test("strict checks the final text size independently of saved measurements", async () => {
  const source = sourceFixture();
  source.edges.ab.label = "a long arrow label";
  const widthEm = 8;
  const narrow = await layout(source, dagreEngine, { widthEm });
  const report = check(source, narrow, {
    measureLabel: (text, style) =>
      measureLabel(text, {
        ...style,
        fontSize: Math.max(style.fontSize, narrow.viewBox[0] / widthEm),
      }),
  });
  expect(report.hard).toBeGreaterThan(0);
  await expect(
    layout(source, dagreEngine, { widthEm, strict: true }),
  ).rejects.toMatchObject({
    constructor: LayoutDefectsError,
    report,
  });
});
