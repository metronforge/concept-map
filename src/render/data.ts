/** Stable JSON lets server and browser compare map data independent of key order. */
export function mapData(value: unknown): string {
  return JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  ).replaceAll("<", "\\u003c");
}
