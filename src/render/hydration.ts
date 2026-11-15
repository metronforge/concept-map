import { mapData } from "./data.js";

/** Reuse a figure only when its embedded data matches the requested map. */
export function canHydrate(data: string | undefined, map: unknown): boolean {
  if (data === undefined) return false;
  try {
    return mapData(JSON.parse(data)) === mapData(map);
  } catch {
    return false;
  }
}
