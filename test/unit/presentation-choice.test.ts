import { expect, it } from "vitest";
import { choosePresentation } from "../../src/layout/stages/presentation";

it.each([
  [0, 0, "wide"],
  [0, 1, "wide"],
  [1, 0, "narrow"],
  [1, 1, "panel"],
] as const)(
  "chooses by hard defects: wide %i, narrow %i",
  (wide, narrow, presentation) => {
    expect(
      choosePresentation(
        { wide: { hard: wide }, narrow: { hard: narrow } },
        20,
      ),
    ).toEqual({ presentation, switchedAt: wide ? 20 : undefined });
  },
);

it("uses only the panel fallback when no narrow layout is available", () => {
  expect(choosePresentation({ wide: { hard: 1 } }, 20)).toEqual({
    presentation: "panel",
    switchedAt: 20,
  });
});

it("requires a clean wide report and a full em of growth to return", () => {
  const clean = { wide: { hard: 0 }, narrow: { hard: 0 } };
  for (const width of [19, 20, 20.999])
    expect(choosePresentation(clean, width, 20)).toEqual({
      presentation: "narrow",
      switchedAt: 20,
    });
  expect(choosePresentation(clean, 21, 20)).toEqual({
    presentation: "wide",
    switchedAt: undefined,
  });
  expect(
    choosePresentation({ wide: { hard: 1 }, narrow: { hard: 0 } }, 22, 20),
  ).toEqual({ presentation: "narrow", switchedAt: 20 });
});

it("retains the original switch width across narrow and panel changes", () => {
  const narrow = choosePresentation(
    { wide: { hard: 1 }, narrow: { hard: 0 } },
    20,
  );
  const panel = choosePresentation(
    { wide: { hard: 1 }, narrow: { hard: 1 } },
    18,
    narrow.switchedAt,
  );
  expect(panel).toEqual({ presentation: "panel", switchedAt: 20 });
  const held = choosePresentation(
    { wide: { hard: 0 }, narrow: { hard: 1 } },
    20.5,
    panel.switchedAt,
  );
  expect(held).toEqual(panel);
  const wide = choosePresentation({ wide: { hard: 0 } }, 21, held.switchedAt);
  expect(wide).toEqual({ presentation: "wide", switchedAt: undefined });
  expect(
    choosePresentation({ wide: { hard: 1 } }, 19, wide.switchedAt),
  ).toEqual({ presentation: "panel", switchedAt: 19 });
});

it("does not mutate reports and keeps independent switch widths per map", () => {
  const reports = Object.freeze({
    wide: Object.freeze({ hard: 0 }),
    narrow: Object.freeze({ hard: 0 }),
  });
  expect(choosePresentation(reports, 21, 20).presentation).toBe("wide");
  expect(choosePresentation(reports, 21, 21).presentation).toBe("narrow");
  expect(choosePresentation(reports, 21, 20).presentation).toBe("wide");
});
