import { fc } from "@fast-check/vitest";
import { AuthoredMapSchema } from "../../../src/components/map/authored-schema";
import {
  ResolvedMapSchema,
  type ResolvedMap,
} from "../../../src/lib/concept-map/schema";
import { authoredFixture } from "../fixtures/map";

export function resolvedFixture(): ResolvedMap {
  const a = AuthoredMapSchema.parse(authoredFixture());
  const source = { label: "a.ts:1-2", url: "https://example.com/a.ts#L1-L2" };
  const deeper = { title: "2.2 More", href: "/more/" };
  return ResolvedMapSchema.parse({
    ...a,
    deeper: a.deeper.map((d) => ({ ...deeper, why: d.why })),
    concepts: a.concepts.map((g) => ({
      ...g,
      items: g.items.map((c) => ({ ...c, source })),
    })),
    scenarios: a.scenarios.map((s) => ({
      ...s,
      steps: s.steps.map((t) => ({
        ...t,
        sources: [source],
        deeper: [deeper],
      })),
    })),
  });
}

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
