import type { RelationSystem } from "../../../src/layout/relations/types.js";

export const midpoint = {
  id: "middle",
  from: "a",
  to: "b",
  part: 1,
  parts: 2,
};

export function endpoints(a: number, b: number) {
  return [
    { variable: "a", position: a / 64 },
    { variable: "b", position: b / 64 },
  ];
}

export function anchored(a: number, b: number): RelationSystem {
  return {
    variables: ["a", "b"].map((id) => ({ id, size: 0 })),
    anchors: endpoints(a, b).map(({ variable, position }) => ({
      id: `pin-${variable}`,
      variable,
      position,
    })),
    relations: [],
  };
}
