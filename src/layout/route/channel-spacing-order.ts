import { coupleChannels } from "./channel-coupling.js";

type Coupled = ReturnType<typeof coupleChannels>;
type Rule = { before: number; after: number };

function topological(size: number, rules: Rule[]) {
  const remaining = new Set(Array.from({ length: size }, (_, i) => i));
  const order: number[] = [];
  while (remaining.size) {
    const next = [...remaining].find(
      (i) => !rules.some((r) => r.after === i && remaining.has(r.before)),
    );
    if (next === undefined) return null;
    remaining.delete(next);
    order.push(next);
  }
  return order;
}

function bendRules(
  index: number,
  bends: Coupled["bends"],
  assigned: Map<number, number[]>,
) {
  return bends.flatMap((bend) => {
    const sides = [bend.horizontal, bend.vertical];
    const own = sides.find((side) => side.group === index);
    if (!own) return [];
    const other = sides.find((side) => side !== own)!;
    const order = assigned.get(other.group);
    if (!order) return [];
    const [a, b] = other.segments;
    const forward = order.indexOf(a) < order.indexOf(b) === bend.sameOrder;
    const [before, after] = forward
      ? own.segments
      : [...own.segments].reverse();
    return [{ before, after }];
  });
}

/** Keep coupled orders; conflicting joins use a single greedy pass, never search. */
export function spacingOrders(routes: Parameters<typeof coupleChannels>[0]) {
  const { groups, bends, components } = coupleChannels(routes);
  const assigned = new Map<number, number[]>();
  for (const component of components) {
    for (const [at, index] of component.groups.entries()) {
      if (component.orders) {
        assigned.set(index, component.orders[at]);
        continue;
      }
      const group = groups[index],
        rules: Rule[] = [];
      const candidates = [
        ...bendRules(index, bends, assigned),
        ...group.constraints.filter((r) => r.end === "low"),
        ...group.constraints.filter((r) => r.end === "high"),
      ];
      for (const rule of candidates)
        if (topological(group.segments.length, [...rules, rule]))
          rules.push(rule);
      assigned.set(index, topological(group.segments.length, rules)!);
    }
  }
  return groups.map((group, i) => ({ ...group, order: assigned.get(i)! }));
}
