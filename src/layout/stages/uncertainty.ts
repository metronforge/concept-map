import type { Drawn } from "./drawn.js";
import type { Judge } from "./contacts.js";

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Only call a measured contact clear or defective if its entire interval is. */
export function judgeContacts(
  shapes: Drawn,
  size: number,
  margin: number,
  tolerance: number,
): Judge {
  const errors = new Map(
    shapes.labels.map((label) => [`label:${label.id}`, label.uncertainty]),
  );
  return (list, a, b, gap) => {
    const uncertainty = (errors.get(a) ?? 0) + (errors.get(b) ?? 0);
    if (gap - uncertainty >= margin) return;
    list.push({
      a,
      b,
      band: gap + uncertainty < -tolerance ? "defect" : "tight",
      gap: round(gap / size),
      ...(uncertainty ? { uncertainty: round(uncertainty / size) } : {}),
    });
  };
}
