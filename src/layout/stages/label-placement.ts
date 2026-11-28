import type { ResolvedMap } from "../../schema.js";
import type { LayoutPoint, LayoutBox, LabelSize } from "../types.js";
import { polylines } from "./paths.js";
import { rectGap } from "./plane.js";
import { contactReduction, lineGaps } from "./contact-reduction.js";
import { clearOf } from "./badge-placement.js";
import { nodeSteps, TEXT } from "./drawn.js";
import {
  labelCandidates,
  labelCost,
  type Segment,
} from "./label-candidates.js";
import { labelBox } from "./number-placement.js";

/** Keep clear labels; reduce overlaps without introducing or deepening any. */
export function placeLabels(map: ResolvedMap): ResolvedMap {
  // Every move reduces an integer penetration sum without worsening any gap,
  // so the initial finite sum bounds the number of successful passes.
  let current = map;
  for (;;) {
    const next = placeLabelPass(current);
    if (
      Object.keys(next.edges).every(
        (id) => next.edges[id] === current.edges[id],
      )
    )
      return next;
    current = next;
  }
}

function placeLabelPass(map: ResolvedMap): ResolvedMap {
  const { boxes, nodes, lines, steps } = obstacles(map);
  const gaps = lineGaps(Object.values(lines).flat());
  const edges = { ...map.edges };
  for (const [id, box] of Object.entries(boxes)) {
    const obstacles = nodes.concat(
      Object.entries(boxes)
        .filter(([key]) => key !== id)
        .map(([, b]) => b),
    );
    const contacts = contactReduction(box, [
      ...obstacles.map((o) => (b: LayoutBox) => rectGap(b, o)),
      ...gaps,
    ]);
    if (!contacts) continue;
    const edge = map.edges[id];
    const size = map.measurement!.labels[id];
    const at = position(
      edge.label!.at,
      map.viewBox,
      contacts,
      steps,
      size,
      obstacles,
      lines[id],
      Object.entries(lines)
        .filter(([key]) => key !== id)
        .flatMap(([, route]) => route),
    );
    if (at === edge.label!.at) continue;
    edges[id] = { ...edge, label: { ...edge.label!, at } };
    boxes[id] = labelBox(at, size, 0);
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
    ...nodeSteps(map, TEXT).map((step): LayoutPoint => [...step.at]),
  ];
  return { boxes, nodes, lines, steps };
}

function position(
  at: LayoutPoint,
  viewBox: LayoutPoint,
  contacts: (box: LayoutBox) => number,
  steps: LayoutPoint[],
  size: LabelSize,
  obstacles: LayoutBox[],
  own: Segment[],
  other: Segment[],
): LayoutPoint {
  const box = labelBox(at, size, 0);
  let best = at;
  let cost = Infinity;
  const limit = Math.hypot(...viewBox);
  for (const point of labelCandidates(box, own, limit, obstacles)) {
    const baseline = candidateBaseline(point, box, at, size, viewBox);
    // Judge the geometry reconstructed from the baseline we will store.
    const candidate = labelBox(baseline, size, 0);
    const [x, y] = candidate;
    if (Math.hypot(x - box[0], y - box[1]) >= cost) continue;
    if (x < 0 || y < 0 || x + box[2] > viewBox[0] || y + box[3] > viewBox[1])
      continue;
    const paint = labelBox(baseline, size, size.padding ?? 0);
    const remaining = contacts(candidate);
    if (
      !Number.isFinite(remaining) ||
      !steps.every((p) => clearOf(p, candidate, 4) && clearOf(p, paint, 1 / 64))
    )
      continue;
    const next =
      remaining * 8 * limit + labelCost(candidate, box, own, other, limit);
    if (next < cost) {
      cost = next;
      best = baseline;
    }
  }
  return best;
}

function candidateBaseline(
  [cx, cy]: LayoutPoint,
  box: LayoutBox,
  at: LayoutPoint,
  size: LabelSize,
  viewBox: LayoutPoint,
): LayoutPoint {
  const padding = size.padding ?? 0;
  const x = Math.max(padding, Math.min(viewBox[0] - box[2] - padding, cx));
  const y = Math.max(padding, Math.min(viewBox[1] - box[3] - padding, cy));
  return [at[0] + x - box[0], at[1] + y - box[1]];
}
