import { expect, test } from "vitest";
import { renderSvg } from "../../../src/render/svg";
import { ResolvedMapSchema } from "../../../src/schema";
import fixture from "../../fixtures/map.json";

test("serialized refined label wrapping replays in server markup, escaping text", () => {
  const map = ResolvedMapSchema.parse(fixture);
  map.edges.ab.label = { text: "<go> & back", at: [70, 80] };
  map.measurement = {
    name: "dom",
    labels: {
      ab: {
        width: 40,
        height: 30,
        wrap: { lines: ["<go> ", "& back"], lineHeight: 12 },
      },
    },
  };
  const restored = ResolvedMapSchema.parse(JSON.parse(JSON.stringify(map)));
  expect(renderSvg(restored)).toContain(
    '<tspan x="70" y="74">&lt;go&gt; </tspan><tspan x="70" y="86">&amp; back</tspan>',
  );
});
