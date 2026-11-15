import type { Point } from "./path.js";
export interface BadgeObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}
function clearOf([x, y]: Point, radius: number, box: BadgeObstacle): boolean {
  return (
    Math.hypot(
      Math.max(box.x - x, 0, x - box.x - box.width),
      Math.max(box.y - y, 0, y - box.y - box.height),
    ) >=
    radius + 3
  );
}
/** Keep intentional node/edge attachments unless actual label text overlaps. */
export function placeBadge(
  origin: Point,
  radius: number,
  labels: BadgeObstacle[],
  bounds: BadgeObstacle,
  obstacles: BadgeObstacle[] = [],
): Point {
  if (labels.every((box) => clearOf(origin, radius, box))) return origin;
  const clear = ([x, y]: Point) =>
    x - radius >= bounds.x &&
    y - radius >= bounds.y &&
    x + radius <= bounds.x + bounds.width &&
    y + radius <= bounds.y + bounds.height &&
    [...labels, ...obstacles].every((box) => clearOf([x, y], radius, box));
  const limit = Math.hypot(bounds.width, bounds.height);
  for (let distance = 4; distance <= limit; distance += 4)
    for (let angle = 0; angle < 16; angle++) {
      const radians = (angle * Math.PI) / 8;
      const candidate: Point = [
        origin[0] + Math.cos(radians) * distance,
        origin[1] + Math.sin(radians) * distance,
      ];
      if (clear(candidate)) return candidate;
    }
  return origin;
}
