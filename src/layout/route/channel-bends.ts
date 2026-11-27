import type { sharedChannels } from "./channel-tracks.js";

type Group = ReturnType<typeof sharedChannels>[number];
type Bend = {
  corner: number[];
  horizontal: { group: number; segments: number[] };
  vertical: { group: number; segments: number[] };
  sameOrder: boolean;
};

function turns(horizontal: Group, vertical: Group) {
  const result = [];
  for (const [h, a] of horizontal.segments.entries()) {
    for (const [v, b] of vertical.segments.entries()) {
      if (a.edge !== b.edge || Math.abs(a.segment - b.segment) !== 1) continue;
      const dx =
        a.start === vertical.coordinate
          ? 1
          : a.end === vertical.coordinate
            ? -1
            : 0;
      const dy =
        b.start === horizontal.coordinate
          ? 1
          : b.end === horizontal.coordinate
            ? -1
            : 0;
      if (dx && dy) result.push({ h, v, dx, dy });
    }
  }
  return result;
}

function links(horizontal: Group, vertical: Group, h: number, v: number) {
  const shared = turns(horizontal, vertical),
    result = [];
  for (const [i, a] of shared.entries()) {
    for (const b of shared.slice(i + 1)) {
      if (a.dx !== b.dx || a.dy !== b.dy) continue;
      result.push({
        corner: [vertical.coordinate, horizontal.coordinate],
        horizontal: { group: h, segments: [a.h, b.h] },
        vertical: { group: v, segments: [a.v, b.v] },
        sameOrder: a.dx * a.dy === 1,
      });
    }
  }
  return result;
}

/** Only common right-angle turns link two groups; point touches do not. */
export function sharedBends(groups: Group[]): Bend[] {
  return groups.flatMap((horizontal, h) =>
    horizontal.axis !== 0
      ? []
      : groups.flatMap((vertical, v) =>
          vertical.axis !== 1 ? [] : links(horizontal, vertical, h, v),
        ),
  );
}

export function linkedGroups(groups: Group[], bends: Bend[]) {
  const remaining = new Set(groups.map((_, i) => i)),
    components = [];
  while (remaining.size) {
    const pending = [remaining.values().next().value!],
      component = [];
    for (const at of pending) {
      if (!remaining.delete(at)) continue;
      component.push(at);
      for (const { horizontal: h, vertical: v } of bends) {
        if (h.group === at) pending.push(v.group);
        if (v.group === at) pending.push(h.group);
      }
    }
    components.push(component.sort((a, b) => a - b));
  }
  return components;
}
