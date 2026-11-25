import { polylines } from "../../dist/layout/stages/paths.js";

function boxes(record = {}) {
  return Object.entries(record).map(([id, { box }]) => {
    if (!box || box.some((n) => !Number.isFinite(n)) || box.length !== 4)
      throw new Error(`Missing or invalid box: ${id}`);
    if (box[2] <= 0 || box[3] <= 0)
      throw new Error(`Non-positive box size: ${id}`);
    return { id, box: [...box] };
  });
}

/** Corners allow either outward side; no route interior chooses a direction. */
function attachment([px, py], [x, y, width, height]) {
  const horizontal = x <= px && px <= x + width;
  const vertical = y <= py && py <= y + height;
  const candidates = [
    ["top", horizontal && py <= y, y - py],
    ["right", vertical && px >= x + width, px - x - width],
    ["bottom", horizontal && py >= y + height, py - y - height],
    ["left", vertical && px <= x, x - px],
  ].filter(([, valid]) => valid);
  if (!candidates.length)
    throw new Error(
      `Terminal is inside or not aligned with its box: ${px},${py}`,
    );
  return {
    sides: candidates.map(([side]) => side),
    gap: Math.min(...candidates.map(([, , distance]) => distance)),
  };
}

function terminal(id, point, shapes) {
  const matches = shapes.filter((shape) => shape.id === id);
  if (matches.length !== 1)
    throw new Error(`Expected one node or frame for endpoint: ${id}`);
  const { kind, box } = matches[0];
  return { id, kind, point: [...point], ...attachment(point, box) };
}

function connection(id, edge, shapes) {
  const paths = polylines(edge.path, true);
  if (paths.length !== 1)
    throw new Error(`Expected one connected route for edge: ${id}`);
  const points = paths[0];
  return {
    id,
    from: terminal(edge.from, points[0], shapes),
    to: terminal(edge.to, points.at(-1), shapes),
  };
}

/** Shared candidate input: placed boxes and ports, with no old route interiors. */
export function prepare({ id, resolved }) {
  const nodes = boxes(resolved.nodes);
  const frames = boxes(resolved.frames);
  const shapes = [
    ...nodes.map((shape) => ({ ...shape, kind: "node" })),
    ...frames.map((shape) => ({ ...shape, kind: "frame" })),
  ];
  return {
    id,
    ...(resolved.viewBox ? { viewBox: [...resolved.viewBox] } : {}),
    nodes,
    frames,
    edges: Object.entries(resolved.edges).map(([key, edge]) =>
      connection(key, edge, shapes),
    ),
  };
}
