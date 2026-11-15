import { test, expect } from "vitest";
import * as core from "../../src/index";
import { resolvedFixture } from "./fixtures/map";

test("the core renders a complete figure without browser exports", () => {
  expect(core).toHaveProperty("renderFigure");
  expect(core).not.toHaveProperty("MapPlayer");
  const map = resolvedFixture();
  const html = core.renderFigure(map);
  expect(html).toContain('data-figure="map"');
  expect(html).toContain('data-mode="all"');
  expect(html).toContain("data-map-status");
  expect(html).toContain(core.renderConcepts(map));
  expect(html).toContain('type="application/json" data-map-data');
});

test("figure text, identifiers and embedded JSON cannot inject markup", () => {
  const map = resolvedFixture();
  map.title = '</script><img src=x onerror="alert(1)">';
  const html = core.renderFigure(map, { id: 'x" onmouseover="bad' });
  expect(html).not.toContain("<img");
  expect(html).toContain("&lt;/script&gt;");
  expect(html).toContain('id="x&quot; onmouseover=&quot;bad"');
  const json = html.match(/data-map-data>(.*?)<\/script>/s)![1];
  expect(JSON.parse(json)).toEqual(map);
  expect(html.match(/<\/script>/g)).toHaveLength(1);
});
