import type {
  LayoutBox,
  LayoutGraph,
  LayoutResult,
  LayoutRoute,
  LabelSize,
} from "./types.js";
import { bounds } from "./geometry.js";

/** Compact side loops use final node positions, including relocated partitions. */
export function routeSelfEdges(
  graph: LayoutGraph,
  result: LayoutResult,
): LayoutResult {
  const reserved: LayoutBox[] = [];
  for (const edge of graph.edges) {
    if (edge.from !== edge.to) continue;
    const box = result.nodes[edge.from];
    const neighbors = Object.entries(result.nodes)
      .filter(([id]) => id !== edge.from)
      .map(([, b]) => b)
      .concat(reserved);
    const candidates = [
      ...[1, -1].map((side) => selfRoute(box, edge.label, side)),
      ...[-1, 1].map((side) => verticalRoute(box, edge.label, side)),
    ];
    candidates.sort(
      (a, b) =>
        interference(a, edge.label, neighbors) -
        interference(b, edge.label, neighbors),
    );
    result.edges[edge.id] = candidates[0];
    reserved.push(routeBounds(candidates[0], edge.label));
  }
  return result;
}

function selfRoute(
  box: LayoutBox,
  label: LabelSize | undefined,
  side: number,
  reach = 24,
): LayoutRoute {
  const [x, y, w, h] = box;
  const start = x + (side > 0 ? w : 0);
  const outside = start + side * reach;
  return {
    points: [
      [start, y + h / 4],
      [outside, y + h / 4],
      [outside, y + (3 * h) / 4],
      [start, y + (3 * h) / 4],
    ],
    ...(label
      ? {
          label: [outside + side * (12 + label.width / 2), y + h / 2] as [
            number,
            number,
          ],
        }
      : {}),
  };
}

/** Swap the route axes while keeping measured label dimensions unrotated. */
function verticalRoute(
  box: LayoutBox,
  label: LabelSize | undefined,
  side: number,
): LayoutRoute {
  const [x, y, w, h] = box;
  const route = selfRoute(
    [y, x, h, w],
    label ? { width: label.height, height: label.width } : undefined,
    side,
    Math.min(24, h),
  );
  return {
    points: route.points.map(([px, py]) => [py, px]),
    ...(route.label
      ? { label: [route.label[1], route.label[0]] as [number, number] }
      : {}),
  };
}

function routeBounds(
  route: LayoutRoute,
  label: LabelSize | undefined,
): LayoutBox {
  const boxes: LayoutBox[] = route.points.map(([x, y]) => [x, y, 0, 0]);
  if (route.label && label)
    boxes.push([
      route.label[0] - label.width / 2,
      route.label[1] - label.height / 2,
      label.width,
      label.height,
    ]);
  return bounds(boxes);
}

function interference(
  route: LayoutRoute,
  label: LabelSize | undefined,
  neighbors: LayoutBox[],
): number {
  const [x, y, w, h] = routeBounds(route, label);
  return neighbors.reduce(
    (area, [nx, ny, nw, nh]) =>
      area +
      Math.max(0, Math.min(x + w + 12, nx + nw) - Math.max(x - 12, nx)) *
        Math.max(0, Math.min(y + h + 12, ny + nh) - Math.max(y - 12, ny)),
    0,
  );
}
