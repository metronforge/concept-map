import { readFileSync } from "node:fs";
import { ResolvedMapSchema } from "../../src/schema";

/** Intentional wide label defect and a clean alternate drawing of the same map. */
export function candidateMaps() {
  const wide = ResolvedMapSchema.parse(
    JSON.parse(readFileSync("test/fixtures/map.json", "utf8")),
  );
  wide.lanes = {};
  wide.frames = {};
  for (const node of Object.values(wide.nodes)) delete node.lane;
  wide.scenarios[0].repeatBadges = [];
  wide.viewBox = [1200, 200];
  wide.nodes.a.box = [0, 0, 1200, 88];
  wide.nodes.b.box = [0, 112, 1200, 88];
  wide.edges.ab.path = "M35 88 V112";
  wide.edges.ab.label = { text: "go", at: [65, 104] };
  const narrow = structuredClone(wide);
  narrow.viewBox = [300, 400];
  narrow.nodes.a.box = [0, 0, 300, 50];
  narrow.nodes.b.box = [0, 350, 300, 50];
  narrow.edges.ab.path = "M35 50 V350";
  narrow.edges.ab.label = { text: "go", at: [70, 200] };
  return { wide, narrow };
}
