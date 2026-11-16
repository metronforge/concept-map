import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SourceMapSchema } from "../../src/schema.js";
import { layout } from "../../src/layout/index.js";
import { dagreEngine } from "../../src/layout/dagre.js";
import { reducedFlow } from "../../src/model/flow.js";

const read = (name: string, file: string) =>
  readFileSync(`examples/${name}/${file}`, "utf8");
const source = (name: string) =>
  SourceMapSchema.parse(JSON.parse(read(name, "map.json")));

describe("standalone examples", () => {
  for (const name of ["coffee", "door", "gcd"]) {
    it(`${name} has a coordinate-free map and a single CDN script`, async () => {
      const map = source(name);
      const resolved = await layout(map, dagreEngine);
      expect(Object.keys(resolved.nodes)).toEqual(Object.keys(map.nodes));
      const html = read(name, "index.html");
      expect(html.match(/<script\b/g)).toHaveLength(1);
      expect(html.match(/<concept-map\b/g)).toHaveLength(1);
      expect(html).toMatch(/<concept-map src="\.\/map\.json" layout="dagre">/);
      expect(html).toContain(
        'src="https://esm.sh/@metronforge/concept-map@0.2.0/element"',
      );
      expect(html).toContain(
        'href="https://esm.sh/@metronforge/concept-map@0.2.0/css"',
      );
      const readme = read(name, "README.md");
      for (const entry of ["element", "css"])
        expect(readme).toContain(
          `https://esm.sh/@metronforge/concept-map@0.2.0/${entry}`,
        );
      for (const scenario of resolved.scenarios) {
        for (let i = 1; i < (scenario.flow?.length ?? 0); i++) {
          const hop = scenario.flow![i];
          const edge = resolved.edges[hop.edge!];
          expect(edge.from).toBe(scenario.flow![i - 1].node);
          expect(edge.to).toBe(hop.node);
        }
      }
    });
  }
  it("records all three Euclidean divisions and skips the loop for zero", async () => {
    const map = await layout(source("gcd"), dagreEngine);
    const first = map.scenarios[0];
    expect(first.flow?.filter((hop) => hop.edge === "loop")).toHaveLength(3);
    expect(first.repeatBadges?.map((b) => b.step)).toEqual([
      "turn-1",
      "turn-2",
      "turn-3",
    ]);
    const logs = reducedFlow(map, 0).log.map((line) => line.text);
    expect(logs).toEqual([
      "a = 48, b = 18",
      "48 mod 18 = 12",
      "a = 18, b = 12",
      "18 mod 12 = 6",
      "a = 12, b = 6",
      "12 mod 6 = 0",
      "a = 6, b = 0",
      "gcd(48, 18) = 6",
    ]);
    expect(map.scenarios[1].flow?.some((h) => h.edge === "loop")).toBe(false);
    expect(reducedFlow(map, 1).log.at(-1)?.text).toBe("gcd(5, 0) = 5");
  });
  it("keeps the locked door in the same state when pushed", () => {
    const map = source("door");
    expect(map.edges.blocked).toMatchObject({ from: "locked", to: "locked" });
    expect(map.scenarios[0].flow?.find((h) => h.edge === "blocked")?.node).toBe(
      "locked",
    );
  });
});
