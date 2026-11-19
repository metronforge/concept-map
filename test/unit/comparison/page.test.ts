import { expect, test } from "vitest";
import { graphSvg, page } from "../../../scripts/comparison/page.mjs";
import { geometryMetrics } from "../../../scripts/comparison/metrics.mjs";
import { resolvedFixture } from "../arbitraries/map";

test("standalone comparison SVG has one native-size width and height", () => {
  const map = resolvedFixture();
  map.viewBox = [315, 180];
  const root = graphSvg(map, "comparison", true).match(/^<svg\b[^>]*>/)![0];
  expect(root.match(/\bwidth="[^"]*"/g)).toEqual(['width="315"']);
  expect(root.match(/\bheight="[^"]*"/g)).toEqual(['height="180"']);
  expect(root).toContain('viewBox="0 0 315 180"');
  expect(root).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(graphSvg(map, "comparison")).toMatch(/^<svg width="480" /);
});

test.each([true, false])(
  "comparison renders both intent variants with hand=%s",
  (hand) => {
    const map = resolvedFixture();
    const names = ["dagre", "dagre-plain", "elk", "elk-plain"];
    if (hand) names.unshift("manual");
    const variants = Object.fromEntries(names.map((name) => [name, map]));
    const entry = {
      id: "example",
      title: map.title,
      variants: Object.fromEntries(
        names.map((name) => [
          name,
          {
            metrics: geometryMetrics(map, map),
            timing: null,
          },
        ]),
      ),
    };
    const html = page.mapSection(entry, variants);
    expect(html).toContain(
      `<span class="eyebrow">${hand ? "REFERENCE · example" : "EXAMPLE"}</span>`,
    );
    for (const name of names) {
      expect(html).toContain(`data-variant="${name}"`);
      expect(html).toContain(`data/example-${name}.json`);
    }
    expect(html.match(/<article /g)).toHaveLength(names.length);
    expect(html.match(/Server check\(\) report/g)).toHaveLength(names.length);
    expect(html).toContain("dagre · without intent");
    expect(html).toContain("ELK · with intent");
    if (!hand) expect(html).not.toContain('data-variant="manual"');
  },
);
