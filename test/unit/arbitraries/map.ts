import { fc } from "@fast-check/vitest";
import type { ResolvedMap } from "../../../src/schema";
import { resolvedFixture } from "../fixtures/map";
export { resolvedFixture };

export function handMaps(): ResolvedMap[] {
  const m = resolvedFixture();
  const multiple = structuredClone(m);
  multiple.scenarios.push({
    ...structuredClone(m.scenarios[0]),
    id: "short",
    label: "Short",
    steps: [m.scenarios[0].steps[0]],
    flow: [],
    repeatBadges: [],
  });
  return [m, multiple];
}

/** Generated cases mutate an existing fixture; stage 4 also supplies the real maps. */
export function mapArbitrary(maps: ResolvedMap[] = handMaps()) {
  return fc
    .tuple(fc.constantFrom(...maps), fc.boolean(), fc.boolean())
    .map(([base, allEdges, nodeBadges]) => {
      const m = structuredClone(base);
      for (const s of m.scenarios) {
        s.display.edges = allEdges ? "all" : "progressive";
        s.display.nodeBadges = nodeBadges;
      }
      return m;
    });
}
