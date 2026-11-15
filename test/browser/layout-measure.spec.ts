import { measureLabel } from "../../src/layout/measure";
import { test, expect } from "@playwright/test";
test("host font measurement is repeatable and leaves no temporary DOM", async ({
  page,
}) => {
  await page.goto("/2-actions/2-1-two-loops/");
  const result = await page.evaluate(async () => {
    const { createDomMeasurer } = await import(
      new URL("/assets/player.js", location.href).href
    );
    await document.fonts.ready;
    const host = document.createElement("div");
    host.style.setProperty("--cmap-font-mono", "monospace");
    document.body.append(host);
    const measure = createDomMeasurer(host);
    const style = { fontSize: 20, mono: true };
    const first = measure("Hello", style),
      second = measure("Hello", style);
    const longer = measure("HelloHello", style);
    const children = host.childElementCount;
    host.remove();
    return { first, second, longer, children };
  });
  expect(result.first).toEqual(result.second);
  expect(result.first.width).toBeGreaterThan(0);
  expect(result.first.height).toBeGreaterThan(0);
  expect(result.longer.width).toBeCloseTo(result.first.width * 2, 0);
  expect(result.children).toBe(0);
});

test("Cyrillic server widths match DejaVu Sans in the browser within five percent", async ({
  page,
}) => {
  await page.route("**/test-dejavu.ttf", (route) =>
    route.fulfill({
      path: "test/fixtures/fonts/DejaVuSans.ttf",
      contentType: "font/ttf",
    }),
  );
  await page.goto("/2-actions/2-1-two-loops/");
  const widths = await page.evaluate(async () => {
    const face = new FontFace("LayoutTestDejaVu", "url(/test-dejavu.ttf)");
    document.fonts.add(await face.load());
    const { createDomMeasurer } = await import(
      new URL("/assets/player.js", location.href).href
    );
    const host = document.createElement("div");
    host.style.setProperty("--cmap-font-sans", "LayoutTestDejaVu");
    document.body.append(host);
    const measure = createDomMeasurer(host);
    const result = ["Кассир", "Бариста"].map((text) => ({
      text,
      width: measure(text, { fontSize: 12.5, mono: false }).width,
    }));
    host.remove();
    return result;
  });
  for (const { text, width } of widths) {
    const server = measureLabel(text, { fontSize: 12.5, mono: false }).width;
    expect(Math.abs(server - width) / width, text).toBeLessThanOrEqual(0.05);
  }
});
