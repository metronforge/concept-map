import { exactTicks } from "./check-witness.js";
import type { RelationPlacement } from "./result.js";

/** A position at part / parts between two already placed variables.
 * Midpoints use part = 1, parts = 2; rows use successive parts from 0 to parts.
 * Derived ids are distinct from placed variables; derivations cannot chain.
 */
export interface DerivedPosition {
  id: string;
  from: string;
  to: string;
  part: number;
  parts: number;
}

function coordinates(placements: RelationPlacement[]) {
  const values = new Map<string, bigint>();
  for (const placement of placements) {
    const value = exactTicks(placement.position);
    if (value === undefined || values.has(placement.variable))
      throw new Error("Derived positions need unique, on-grid placements");
    values.set(placement.variable, value);
  }
  return values;
}

/** Validate source data only; never calculate a proposed position here. */
export function prepareDerivations(
  placements: RelationPlacement[],
  requests: DerivedPosition[],
) {
  const values = coordinates(placements);
  const ids = new Set(values.keys());
  return Array.from(requests, ({ id, from, to, part, parts }) => {
    const a = values.get(from);
    const b = values.get(to);
    if (ids.has(id)) throw new Error(`Duplicate derived position id: ${id}`);
    ids.add(id);
    if (a === undefined || b === undefined)
      throw new Error("Derived endpoints must name already placed variables");
    if (
      !Number.isSafeInteger(part) ||
      !Number.isSafeInteger(parts) ||
      parts < 1 ||
      part < 0 ||
      part > parts
    )
      throw new RangeError(
        "Derived parts need integers with 0 <= part <= parts",
      );
    return { id, a, b, k: BigInt(part), n: BigInt(parts) };
  });
}

/** Exact nearest integer, with ties toward minus infinity, even below zero. */
export function roundRatio(numerator: bigint, denominator: bigint): bigint {
  const remainder = ((numerator % denominator) + denominator) % denominator;
  const floor = (numerator - remainder) / denominator;
  return floor + (2n * remainder > denominator ? 1n : 0n);
}
