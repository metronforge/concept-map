import { test, expect } from "vitest";
import { resolvedFixture } from "./arbitraries/map";
import { derive } from "../../src/model/frame";
import { initialState } from "../../src/model/state";
import { renderPanelParts } from "../../src/render/panel";
for (const sources of [false, true])
  for (const deeper of [false, true]) {
    test(`reference sections: sources ${sources}, deeper ${deeper}`, () => {
      const map = resolvedFixture();
      const frame = derive(map, initialState);
      if (frame.panel.kind !== "step") throw new Error("Expected step");
      frame.panel.sources = sources
        ? [{ label: "Reference", url: "https://example.com" }]
        : [];
      frame.panel.deeper = deeper
        ? [{ title: "More", href: "https://example.com/more" }]
        : [];
      const { more } = renderPanelParts(map, frame);
      expect(more.includes('class="src"')).toBe(sources);
      expect(more.includes('class="refs"')).toBe(sources || deeper);
      expect(more.includes("Go deeper")).toBe(deeper);
    });
  }
