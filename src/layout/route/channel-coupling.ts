import { orderChannels } from "./channel-order.js";
import { sharedBends, linkedGroups } from "./channel-bends.js";

type Group = ReturnType<typeof orderChannels>[number];
type Bend = ReturnType<typeof sharedBends>[number];
type Rule = { before: number; after: number };

function rulesFor(
  index: number,
  groups: Group[],
  bends: Bend[],
  assigned: Map<number, number[]>,
) {
  const rules: Rule[] = [...groups[index].constraints];
  for (const bend of bends) {
    const sides = [bend.horizontal, bend.vertical];
    const own = sides.find((side) => side.group === index);
    if (!own) continue;
    const other = sides.find((side) => side !== own)!;
    const order = assigned.get(other.group);
    if (!order) continue;
    const [a, b] = other.segments;
    const forward = order.indexOf(a) < order.indexOf(b) === bend.sameOrder;
    const [before, after] = forward
      ? own.segments
      : [...own.segments].reverse();
    rules.push({ before, after });
  }
  return rules;
}

function* orders(
  remaining: number[],
  rules: Rule[],
  prefix: number[] = [],
): Generator<number[]> {
  if (!remaining.length) {
    yield prefix;
    return;
  }
  for (const at of remaining) {
    if (rules.some((r) => r.after === at && remaining.includes(r.before)))
      continue;
    yield* orders(
      remaining.filter((i) => i !== at),
      rules,
      [...prefix, at],
    );
  }
}

function solve(
  component: number[],
  groups: Group[],
  bends: Bend[],
  assigned = new Map<number, number[]>(),
): number[][] | null {
  const index = component[assigned.size];
  if (index === undefined) return component.map((i) => assigned.get(i)!);
  const group = groups[index];
  const rules = rulesFor(index, groups, bends, assigned);
  for (const order of orders(
    group.segments.map((_, i) => i),
    rules,
  )) {
    assigned.set(index, order);
    const result = solve(component, groups, bends, assigned);
    if (result) return result;
    assigned.delete(index);
  }
  return null;
}

/** Joint fixed-run orders, without moving routes. */
export function coupleChannels(routes: Parameters<typeof orderChannels>[0]) {
  const groups = orderChannels(routes),
    bends = sharedBends(groups);
  const components = linkedGroups(groups, bends).map((component) => ({
    groups: component,
    orders: component.some((i) => groups[i].order === null)
      ? null
      : solve(component, groups, bends),
  }));
  return { groups, bends, components };
}
