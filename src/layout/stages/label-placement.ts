import type { ResolvedMap } from "../../schema.js";
import type { LayoutPoint, LayoutBox } from "../types.js";
import { polylines } from "./paths.js";
import { rectGap, segmentRectGap } from "./plane.js";
import { clearOf } from "./badge-placement.js";
import {
  labelCandidates,
  labelCost,
  type Segment,
} from "./label-candidates.js";
import { labelBox } from "./number-placement.js";

/** Keep clear labels; move crossed labels to the least-cost clear candidate. */
export function placeLabels(map: ResolvedMap): ResolvedMap {
  const { boxes, nodes, lines, steps } = obstacles(map);
  const edges = { ...map.edges };
  for (const [id, box] of Object.entries(boxes)) {
    const obstacles = nodes.concat(
      Object.entries(boxes)
        .filter(([key]) => key !== id)
        .map(([, b]) => b),
    );
    const clear = (b: LayoutBox, gap = 0) =>
      obstacles.every((o) => rectGap(b, o) >= gap) &&
      Object.values(lines)
        .flat()
        .every(([a, c]) => segmentRectGap(a, c, b) >= gap);
    if (clear(box)) continue;
    const at = position(
      box,
      map.viewBox,
      (candidate) => clear(candidate, 1 / 64),
      steps,
      map.measurement!.labels[id].padding ?? 0,
      lines[id],
      Object.entries(lines)
        .filter(([key]) => key !== id)
        .flatMap(([, route]) => route),
    );
    if (at[0] === box[0] && at[1] === box[1]) continue;
    const edge = map.edges[id];
    const baseline: LayoutPoint = [
      edge.label!.at[0] + at[0] - box[0],
      edge.label!.at[1] + at[1] - box[1],
    ];
    edges[id] = { ...edge, label: { ...edge.label!, at: baseline } };
    boxes[id] = [at[0], at[1], box[2], box[3]];
  }
  return { ...map, edges };
}

function obstacles(map: ResolvedMap) {
  const entries = Object.entries(map.edges);
  const boxes = Object.fromEntries(
    entries.flatMap(([id, edge]) =>
      edge.label?.text
        ? [[id, labelBox(edge.label.at, map.measurement!.labels[id], 0)]]
        : [],
    ),
  );
  const nodes = Object.values(map.nodes).map((node) => node.box);
  const lines = Object.fromEntries(
    entries.map(([id, edge]) => [
      id,
      polylines(edge.path).flatMap((line) =>
        line.slice(1).map((end, i) => [line[i], end] as const),
      ),
    ]),
  );
  const steps = [
    ...entries.flatMap(([, edge]) => (edge.badge ? [edge.badge] : [])),
    ...map.scenarios.flatMap((s) => (s.repeatBadges ?? []).map((b) => b.at)),
  ];
  return { boxes, nodes, lines, steps };
}

function position(
  box: LayoutBox,
  viewBox: LayoutPoint,
  clear: (box: LayoutBox) => boolean,
  steps: LayoutPoint[],
  padding: number,
  own: Segment[],
  other: Segment[],
): LayoutPoint {
  let best: LayoutPoint = [box[0], box[1]];
  let cost = Infinity;
  for (const [x, y] of labelCandidates(box, own, Math.hypot(...viewBox))) {
    if (Math.hypot(x - box[0], y - box[1]) >= cost) continue;
    const candidate: LayoutBox = [x, y, box[2], box[3]];
    if (x < 0 || y < 0 || x + box[2] > viewBox[0] || y + box[3] > viewBox[1])
      continue;
    const paint: LayoutBox = [
      x - padding,
      y - padding,
      box[2] + 2 * padding,
      box[3] + 2 * padding,
    ];
    if (
      !clear(candidate) ||
      !steps.every((p) => clearOf(p, candidate, 4) && clearOf(p, paint, 1 / 64))
    )
      continue;
    const next = labelCost(candidate, box, own, other, Math.hypot(...viewBox));
    if (next < cost) {
      cost = next;
      best = [x, y];
    }
  }
  return best;
}
