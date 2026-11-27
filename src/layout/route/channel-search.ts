import { channelGrid, permits } from "./channel-grid.js";

type Grid = ReturnType<typeof channelGrid>;
type Edge = Parameters<typeof channelGrid>[1];
type Link = ReturnType<Grid["neighbours"]>[number];
type State = {
  at: number;
  direction: number;
  bends: number;
  length: number;
  previous: State | null;
};

const compare = (a: State, b: State) =>
  a.bends - b.bends || a.length - b.length;

// Descending queue: pop the lexicographically cheapest state, stable on ties.
function enqueue(queue: State[], state: State) {
  let low = 0,
    high = queue.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (compare(queue[middle], state) > 0) low = middle + 1;
    else high = middle;
  }
  queue.splice(low, 0, state);
}

function extend(state: State, link: Link): State {
  return {
    at: link.next,
    direction: link.direction,
    bends:
      state.bends +
      Number(state.direction !== -1 && state.direction !== link.direction),
    length: state.length + link.length,
    previous: state,
  };
}

function permitted(grid: Grid, edge: Edge, state: State, link: Link) {
  if (!state.previous && !permits(edge.from, link.direction)) return false;
  if (link.next === grid.goal && !permits(edge.to, (link.direction + 2) % 4))
    return false;
  // A reversal would create a zero-area out-and-back "self-loop".
  return state.direction === -1 || link.direction !== (state.direction + 2) % 4;
}

/** Dijkstra over (intersection, incoming direction), minimising bends then length. */
export function shortestChannel(grid: Grid, edge: Edge) {
  if (grid.start < 0 || grid.goal < 0) return null;
  const queue: State[] = [
    { at: grid.start, direction: -1, bends: 0, length: 0, previous: null },
  ];
  const best = new Map<number, State>();
  while (queue.length) {
    const state = queue.pop()!,
      key = state.at * 4 + state.direction;
    if (state.previous && best.get(key) !== state) continue;
    if (state.at === grid.goal && state.previous)
      return vertices(state, grid.points);
    for (const link of grid.neighbours(state.at)) {
      if (!permitted(grid, edge, state, link)) continue;
      const next = extend(state, link),
        nextKey = next.at * 4 + next.direction;
      if (best.has(nextKey) && compare(best.get(nextKey)!, next) <= 0) continue;
      best.set(nextKey, next);
      enqueue(queue, next);
    }
  }
  return null;
}

function vertices(state: State, points: Grid["points"]) {
  const reverse: number[][] = [];
  for (let current: State | null = state; current; current = current.previous)
    if (
      !current.previous ||
      current === state ||
      current.direction !== state.direction
    ) {
      reverse.push([...points[current.at]]);
      state = current;
    }
  return reverse.reverse();
}
