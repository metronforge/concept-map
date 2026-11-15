import { test, expect } from "vitest";
import { measureLabel } from "../../../src/layout/measure";
test.each([
  ["é", 615.234],
  ["Ł", 562.016],
  ["Κ", 655.766],
  ["К", 709.969],
  ["—", 1000],
  ["…", 1000],
  ["\u2009", 199.703],
])("DejaVu advance for %s", (text, width) => {
  expect(measureLabel(text, { fontSize: 1000, mono: false }).width).toBeCloseTo(
    width,
    3,
  );
});
test("uncovered characters retain the one-em fallback", () => {
  expect(measureLabel("界", { fontSize: 16, mono: false }).width).toBe(16);
});
