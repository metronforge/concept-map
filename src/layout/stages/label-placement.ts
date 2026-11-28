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
export function placeLabels(
  map: ResolvedMap,
  fixed: ReadonlySet<string> = new Set(),
): ResolvedMap {
  // Every move reduces an integer penetration sum without worsening any gap,
  // so the initial finite sum bounds the number of successful passes.
  let current = map;
  for (;;) {
    const next = placeLabelPass(current, fixed);
    if (
      Object.keys(next.edges).every(
        (id) => next.edges[id] === current.edges[id],
      )
    )
      return next;
    current = next;
  }
}

function placeLabelPass(
  map: ResolvedMap,
  fixed: ReadonlySet<string>,
): ResolvedMap {
  const { boxes, nodes, lines, steps, nodeStepPoints } = obstacles(map);
  const gaps = lineGaps(Object.values(lines).flat());
  const edges = { ...map.edges };
  for (const [id, box] of Object.entries(boxes)) {
    if (fixed.has(`label:${id}`)) continue;
    const obstacles = nodes.concat(otherValues(boxes, id));
    const contacts = contactReduction(box, [
      ...obstacles.map((o) => (b: LayoutBox) => rectGap(b, o)),
      ...gaps,
    ]);
    const edge = map.edges[id];
    const size = map.measurement!.labels[id];
    if (
      !contacts &&
      !requiredPinStepContact(map, edge.label!.at, size, box, nodeStepPoints)
    )
      continue;
    const at = position(
      edge.label!.at,
      map.viewBox,
      contacts ?? (() => 0),
      steps,
      size,
      obstacles,
      lines[id],
      otherValues(lines, id).flat(),
    );
    if (at === edge.label!.at) continue;
    edges[id] = { ...edge, label: { ...edge.label!, at } };
    boxes[id] = labelBox(at, size, 0);
  }
  return { ...map, edges };
}

function requiredPinStepContact(
  map: ResolvedMap,
  at: LayoutPoint,
  size: LabelSize,
  box: LayoutBox,
  steps: LayoutPoint[],
) {
  if (
    !map.layout?.hints.some(
      (h) => h.kind === "pin" && h.strength === "required",
    )
  )
    return false;
  const paint = labelBox(at, size, size.padding ?? 0);
  return steps.some((p) => !clearOf(p, box, 4) || !clearOf(p, paint, 1 / 64));
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
  const nodeStepPoints = nodeSteps(map, TEXT).map((step): LayoutPoint => [
    ...step.at,
  ]);
  const steps = [
    ...entries.flatMap(([, edge]) => (edge.badge ? [edge.badge] : [])),
    ...map.scenarios.flatMap((s) => (s.repeatBadges ?? []).map((b) => b.at)),
    ...nodeStepPoints,
  ];
  return { boxes, nodes, lines, steps, nodeStepPoints };
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

function otherValues<T>(values: Record<string, T>, id: string): T[] {
  return Object.entries(values)
    .filter(([key]) => key !== id)
    .map(([, value]) => value);
}
