import type {
  RelationSystem,
  RelationSource,
} from "../../../src/layout/relations/types.js";
import type { RelationSolution } from "../../../src/layout/relations/result.js";

export const system: RelationSystem = {
  variables: ["a", "b", "c"].map((id) => ({ id, size: 0 })),
  anchors: [{ id: "pin", variable: "a", position: 0 }],
  relations: [
    { id: "ab", from: "a", to: "b", kind: "minimum", gap: 1 },
    { id: "bc", from: "b", to: "c", kind: "equal", gap: 2 },
  ],
};

export function source(id: string, reverse = false): RelationSource {
  return { kind: id === "pin" ? "anchor" : "relation", id, reverse };
}

export function determined(): Extract<
  RelationSolution,
  { status: "determined" }
> {
  return {
    status: "determined",
    placements: [
      { variable: "a", position: 0, chain: [source("pin")] },
      { variable: "b", position: 1, chain: [source("pin"), source("ab")] },
      {
        variable: "c",
        position: 3,
        chain: [source("pin"), source("ab"), source("bc")],
      },
    ],
  };
}

export const freeSystem: RelationSystem = {
  ...system,
  relations: [system.relations[1]],
};

export function underdetermined(): Extract<
  RelationSolution,
  { status: "underdetermined" }
> {
  return {
    status: "underdetermined",
    placements: [
      { variable: "a", position: 0 },
      { variable: "b", position: 0 },
      { variable: "c", position: 2 },
    ],
    shift: { variables: ["b", "c"], delta: -1 / 64 },
  };
}
