import { sharedChannels } from "./channel-tracks.js";

type Group = ReturnType<typeof sharedChannels>[number];
type Rule = { before: number; after: number; at: number; end: "low" | "high" };

function constraints(segments: Group["segments"]) {
  const result: Rule[] = [];
  for (const [i, a] of segments.entries()) {
    for (let j = i + 1; j < segments.length; j++) {
      const b = segments[j];
      const low = Math.max(a.start, b.start),
        high = Math.min(a.end, b.end);
      if (low >= high) continue;
      for (const end of ["low", "high"] as const) {
        const at = end === "low" ? low : high;
        const boundary = end === "low" ? "start" : "end";
        const first = a[boundary] === at ? a[end] : 0;
        const second = b[boundary] === at ? b[end] : 0;
        if (first === null || second === null || first === second) continue;
        result.push({
          before: first < second ? i : j,
          after: first < second ? j : i,
          at,
          end,
        });
      }
    }
  }
  return result;
}

function cycleWitness(remaining: number[], rules: Rule[]) {
  const chain = [],
    seen = new Map<number, number>();
  let at = remaining[0];
  while (!seen.has(at)) {
    seen.set(at, chain.length);
    chain.push(at);
    at = rules.find(
      (rule) => rule.after === at && remaining.includes(rule.before),
    )!.before;
  }
  return [...chain.slice(seen.get(at)!), at].reverse();
}

function order(group: Group) {
  const rules = constraints(group.segments);
  const remaining = group.segments.map((_, i) => i),
    sorted: number[] = [];
  let unique = true;
  while (remaining.length) {
    const ready = remaining.filter(
      (i) =>
        !rules.some(
          (rule) => rule.after === i && remaining.includes(rule.before),
        ),
    );
    if (!ready.length)
      return {
        ...group,
        constraints: rules,
        order: null,
        cycle: cycleWitness(remaining, rules),
      };
    if (ready.length > 1) unique = false;
    sorted.push(ready[0]);
    remaining.splice(remaining.indexOf(ready[0]), 1);
  }
  return { ...group, constraints: rules, order: sorted, unique, cycle: [] };
}

/** Order towards increasing perpendicular coordinate; no coordinates are moved. */
export const orderChannels = (routes: Parameters<typeof sharedChannels>[0]) =>
  sharedChannels(routes).map(order);
