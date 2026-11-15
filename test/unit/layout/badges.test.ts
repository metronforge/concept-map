import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { layout, measureLabel } from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const)
  for (const example of ["coffee", "door", "gcd"])
    test(`${name} ${example}: step and repeat badges clear every label`, async () => {
      const source = JSON.parse(
        readFileSync(`examples/${example}/map.json`, "utf8"),
      );
      const map = await layout(source, engine);
      const badges = [
        ...Object.values(map.edges).map((e) => e.badge!),
        ...map.scenarios.flatMap((s) =>
          (s.repeatBadges ?? []).map((b) => b.at),
        ),
      ];
      for (const [x, y] of badges)
        for (const edge of Object.values(map.edges))
          if (edge.label) {
            const { width, height } = measureLabel(edge.label.text, {
              fontSize: 10.5,
              mono: true,
            });
            const [lx, ly] = edge.label.at;
            const dx = Math.max(lx - x, 0, x - lx - width),
              dy = Math.max(ly - height - y, 0, y - ly);
            expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(12);
          }
    });
