/** Select a schema by geometry presence; validation still checks its contents. */
export function layoutLevel(input: unknown): "source" | "resolved" {
  return input !== null && typeof input === "object" && "viewBox" in input
    ? "resolved"
    : "source";
}
