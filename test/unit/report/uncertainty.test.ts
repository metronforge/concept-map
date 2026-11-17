import { expect, it } from "vitest";
import { check } from "../../../src/layout/index";
import { ResolvedMapSchema } from "../../../src/schema";
import fixture from "../../fixtures/map.json";

function report(gap: number, uncertainty?: number, scale = 1) {
  const map = ResolvedMapSchema.parse(fixture);
  map.edges.ab.label = { text: "go", at: [(35 + gap) * scale, 80 * scale] };
  map.edges.ab.path = `M${35 * scale},${40 * scale} V${100 * scale}`;
  return check(map, map, {
    textSize: 10.5 * scale,
    measureLabel: () => ({
      width: 20 * scale,
      height: 12 * scale,
      ...(uncertainty === undefined
        ? {}
        : { uncertainty: uncertainty * scale }),
    }),
  });
}

it("keeps uncertain threshold contacts tight and exposes the allowance", () => {
  expect(report(-1.06).labels.lines[0].band).toBe("defect");
  const contact = report(-1.06, 0.02).labels.lines[0];
  expect(contact).toEqual({
    a: "label:ab",
    b: "line:ab",
    band: "tight",
    gap: -0.101,
    uncertainty: 0.002,
  });
  expect(report(-1.04, 0.02).labels.lines[0].band).toBe("tight");
  expect(report(-1.1, 0.02).labels.lines[0].band).toBe("defect");
  expect(report(2.63, 0.02).labels.lines[0].band).toBe("tight");
  expect(report(2.65, 0.02).labels.lines).toEqual([]);
});

it("leaves exact contacts and non-text verdicts unchanged", () => {
  expect(report(-1.06, 0)).toEqual(report(-1.06));
  expect(report(-1.06, 0.02).steps.steps).toEqual(report(-1.06).steps.steps);
  expect(report(-1.06, 0.02).steps.boxes).toEqual(report(-1.06).steps.boxes);
  expect(report(-1.06, 0.02).constraints).toEqual(report(-1.06).constraints);
});

it("adds both text allowances when two labels meet", () => {
  const map = ResolvedMapSchema.parse(fixture);
  map.edges.ab.label = { text: "one", at: [0, 80] };
  map.edges.other = {
    ...map.edges.ab,
    label: { text: "two", at: [18.93, 80] },
  };
  const contact = (both: boolean) =>
    check(map, map, {
      measureLabel: (text) => ({
        width: 20,
        height: 12,
        uncertainty: both || text === "one" ? 0.015 : 0,
      }),
    }).labels.labels[0];
  expect(contact(false).band).toBe("defect");
  expect(contact(true)).toEqual({
    a: "label:ab",
    b: "label:other",
    gap: -0.102,
    band: "tight",
    uncertainty: 0.003,
  });
});

it("scales uncertainty with text and never trusts saved measurement metadata", () => {
  expect(report(-1.06, 0.02, 2).labels.lines).toEqual(
    report(-1.06, 0.02).labels.lines,
  );
  const map = ResolvedMapSchema.parse(fixture);
  const original = check(map, map);
  map.measurement = {
    name: "lying",
    labels: { ab: { width: 1, height: 1, uncertainty: 1000 } },
  };
  expect(check(map, map)).toEqual(original);
});

it.each([-1, NaN, Infinity])(
  "rejects invalid measurement uncertainty %s",
  (uncertainty) => {
    expect(() => report(-1.06, uncertainty)).toThrow(
      /Invalid label measurement/,
    );
  },
);
