import { expect } from "vitest";
import type { ResolvedMap } from "../../../src/schema";
import { derive } from "../../../src/model/frame";
export function checkDerive(map: ResolvedMap) {
  map.scenarios.forEach((s, scenario) => {
    let previousNodes: string[] = [],
      previousEdges: string[] = [];
    s.steps.forEach((step, index) => {
      const f = derive(map, { scenario, step: index, mode: "step" });
      expect(f.state).toEqual({ scenario, step: index, mode: "step" });
      const shown = Object.keys(f.nodes).filter((id) => f.nodes[id].revealed);
      const edges = Object.keys(f.edges).filter((id) => f.edges[id].revealed);
      expect(shown).toEqual(expect.arrayContaining(previousNodes));
      expect(edges).toEqual(expect.arrayContaining(previousEdges));
      expect(Object.keys(f.nodes).filter((id) => f.nodes[id].current)).toEqual(
        Object.keys(map.nodes).filter((id) => step.current.includes(id)),
      );
      expect(f.panel.kind).toBe("step");
      if (f.panel.kind === "step") {
        expect(f.panel.canBack).toBe(index > 0);
        expect(f.panel.canNext).toBe(index < s.steps.length - 1);
        expect(Boolean(f.panel.nextScenario)).toBe(
          index === s.steps.length - 1 && scenario < map.scenarios.length - 1,
        );
        const old =
          !step.log?.length || s.display.log === "cumulative"
            ? []
            : s.steps
                .slice(Math.max(0, index - 1), index)
                .flatMap((s) => s.log ?? [])
                .slice(-3);
        expect(
          f.panel.log.filter((l) => l.kind === "old").map((l) => l.text),
        ).toEqual(old);
      }
      previousNodes = shown;
      previousEdges = edges;
    });
    const all = derive(map, { scenario, step: 0, mode: "all" });
    expect(
      Object.keys(all.nodes).filter((id) => all.nodes[id].revealed),
    ).toEqual(previousNodes);
    expect(
      Object.keys(all.edges).filter((id) => all.edges[id].revealed),
    ).toEqual(previousEdges);
    expect(Object.values(all.nodes).some((n) => n.current)).toBe(false);
    expect(Object.values(all.edges).some((e) => e.current)).toBe(false);
  });
}
