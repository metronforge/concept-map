import type { LayoutPoint as Point } from "../types.js";

/** Increasing distance is the cost of moving an already resolved number. */
export function* badgeCandidates(origin: Point, limit: number) {
  for (let distance = 4; distance <= limit; distance += 4)
    for (let angle = 0; angle < 16; angle++)
      yield [
        origin[0] + Math.cos((angle * Math.PI) / 8) * distance,
        origin[1] + Math.sin((angle * Math.PI) / 8) * distance,
      ] as Point;
}
