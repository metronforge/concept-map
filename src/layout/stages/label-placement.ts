import type { ResolvedMap } from "../../schema.js";
import type { LayoutPoint, LayoutBox } from "../types.js";
import { polylines } from "./paths.js";
import { rectGap } from "./plane.js";
import { contactReduction, lineGaps } from "./contact-reduction.js";
import { clearOf } from "./badge-placement.js";
import {
  labelCandidates,
  labelCost,
  type Segment,
} from "./label-candidates.js";
import { labelBox } from "./number-placement.js";

/** Keep clear labels; remove contacts without introducing or deepening any. */
export function placeLabels(map: ResolvedMap): ResolvedMap {
  // Every move removes at least one contact without creating another, so
  // the initial finite contact count bounds the number of successful passes.
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
    const at = position(
      box,
      map.viewBox,
      contacts,
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
  contacts: (box: LayoutBox) => number,
  steps: LayoutPoint[],
  padding: number,
  own: Segment[],
  other: Segment[],
): LayoutPoint {
  let best: LayoutPoint = [box[0], box[1]];
  let cost = Infinity;
  for (const [cx, cy] of labelCandidates(box, own, Math.hypot(...viewBox))) {
    const x = Math.max(padding, Math.min(viewBox[0] - box[2] - padding, cx));
    const y = Math.max(padding, Math.min(viewBox[1] - box[3] - padding, cy));
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
    const remaining = contacts(candidate);
    if (
      !Number.isFinite(remaining) ||
      !steps.every((p) => clearOf(p, candidate, 4) && clearOf(p, paint, 1 / 64))
    )
      continue;
    const limit = Math.hypot(...viewBox);
    const next =
      remaining * 8 * limit + labelCost(candidate, box, own, other, limit);
    if (next < cost) {
      cost = next;
      best = [x, y];
    }
  }
  return best;
}
