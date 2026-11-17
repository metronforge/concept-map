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

test("equal arrow text is measured in its own wrapping context", async ({
  page,
}) => {
  await page.goto("/integration/");
  const result = await page.evaluate(async () => {
    const { domMeasurer } = await import("/assets/integration.js");
    const host = document.createElement("div");
    host.innerHTML =
      '<svg><text class="etext" data-edge="wide" style="font:20px monospace">same text</text><text class="etext" data-edge="narrow" style="font:20px monospace"><tspan>same </tspan><tspan>text</tspan></text></svg>';
    document.body.append(host);
    const m = domMeasurer(host);
    const wide = m.measure("same text", {
      fontSize: 10.5,
      mono: true,
      edge: "wide",
    });
    const narrow = m.measure("same text", {
      fontSize: 10.5,
      mono: true,
      edge: "narrow",
    });
    const children = host.querySelectorAll("*").length;
    host.remove();
    return { wide, narrow, children };
  });
  expect(result.narrow.width).toBeLessThan(result.wide.width);
  expect(result.narrow.height).toBeGreaterThan(result.wide.height);
  expect(result.narrow.wrap?.lines).toEqual(["same ", "text"]);
  expect(result.wide.wrap).toBeUndefined();
  expect(result.children).toBe(5);
});

test("paint clearance adds half the stroke width to unstroked text bounds", async ({
  page,
}) => {
  await page.goto("/integration/");
  const padding = await page.evaluate(async () => {
    const { domMeasurer } = await import("/assets/integration.js");
    const host = document.createElement("div");
    host.innerHTML =
      '<svg><text class="etext" data-edge="plain" style="font:20px monospace;stroke:none">same text</text><text class="etext" data-edge="painted" style="font:20px monospace;stroke:black;stroke-width:8px;stroke-linejoin:round">same text</text></svg>';
    document.body.append(host);
    const m = domMeasurer(host);
    const sizes = ["plain", "painted"].map((edge) =>
      m.measure("same text", { fontSize: 10.5, mono: true, edge }),
    );
    host.remove();
    return sizes.map((size) => size.padding!);
  });
  expect(padding[1] - padding[0]).toBeCloseTo(4, 5);
});

test("the DOM measurer reads the styled font's baseline and width", async ({
  page,
}) => {
  await page.goto("/integration/");
  const result = await page.evaluate(async () => {
    const { domMeasurer } = await import("/assets/integration.js");
    const host = document.createElement("div");
    host.innerHTML =
      '<svg><text class="etext" style="font:italic 700 20px serif;word-spacing:3px">same text</text></svg><span style="position:fixed;top:0;left:0;white-space:pre;font:italic 700 20px/1.2 serif;word-spacing:3px">same text<span style="display:inline-block;width:0;height:0;vertical-align:baseline"></span></span>';
    document.body.append(host);
    const span = host.lastElementChild!;
    const baseline =
      span.firstElementChild!.getBoundingClientRect().top -
      span.getBoundingClientRect().top;
    const size = domMeasurer(host).measure("same text", {
      fontSize: 10.5,
      mono: true,
    });
    const expectedWidth = span.getBoundingClientRect().width;
    host.remove();
    return { baseline, ascent: size.ascent, width: size.width, expectedWidth };
  });
  expect(result.ascent).toBeCloseTo(result.baseline, 5);
  expect(result.width).toBeCloseTo(result.expectedWidth, 5);
});
