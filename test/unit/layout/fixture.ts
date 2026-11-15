import { SourceMapSchema } from "../../../src/schema";
import fixture from "../../fixtures/map.json";

export function sourceFixture() {
  const { viewBox: _viewBox, ...map } = structuredClone(fixture);
  return SourceMapSchema.parse({
    ...map,
    nodes: Object.fromEntries(
      Object.entries(map.nodes).map(([id, { box: _box, ...n }]) => [id, n]),
    ),
    lanes: Object.fromEntries(
      Object.entries(map.lanes).map(([id, l]) => [
        id,
        { label: l.label, layer: l.layer },
      ]),
    ),
    frames: Object.fromEntries(
      Object.entries(map.frames).map(([id, { box: _box, ...f }]) => [id, f]),
    ),
    edges: Object.fromEntries(
      Object.entries(map.edges).map(
        ([id, { path: _path, badge: _badge, label, ...e }]) => [
          id,
          { ...e, ...(label ? { label: label.text } : {}) },
        ],
      ),
    ),
    scenarios: map.scenarios.map((s) => ({
      ...s,
      repeatBadges: s.repeatBadges?.map(({ at: _at, ...b }) => b),
    })),
  });
}
