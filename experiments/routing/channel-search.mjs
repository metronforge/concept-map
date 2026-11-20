import { permits } from "./channel-grid.mjs";

const compare = (a, b) => a.bends - b.bends || a.length - b.length;

// Descending queue: pop the lexicographically cheapest state, stable on ties.
function enqueue(queue, state) {
  let low = 0,
    high = queue.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (compare(queue[middle], state) > 0) low = middle + 1;
    else high = middle;
  }
  queue.splice(low, 0, state);
}

function extend(state, link) {
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

function permitted(grid, edge, state, link) {
  if (!state.previous && !permits(edge.from, link.direction)) return false;
  if (link.next === grid.goal && !permits(edge.to, (link.direction + 2) % 4))
    return false;
  // A reversal would create a zero-area out-and-back "self-loop".
  return state.direction === -1 || link.direction !== (state.direction + 2) % 4;
}

/** Dijkstra over (intersection, incoming direction), minimising bends then length. */
export function shortestChannel(grid, edge) {
  const queue = [
    { at: grid.start, direction: -1, bends: 0, length: 0, previous: null },
  ];
  const best = new Map();
  while (queue.length) {
    const state = queue.pop(),
      key = state.at * 4 + state.direction;
    if (state.previous && best.get(key) !== state) continue;
    if (state.at === grid.goal && state.previous)
      return vertices(state, grid.points);
    for (const link of grid.neighbours(state.at)) {
      if (!permitted(grid, edge, state, link)) continue;
      const next = extend(state, link),
        nextKey = next.at * 4 + next.direction;
      if (best.has(nextKey) && compare(best.get(nextKey), next) <= 0) continue;
      best.set(nextKey, next);
      enqueue(queue, next);
    }
  }
  return null;
}

function vertices(state, points) {
  const reverse = [];
  for (let current = state; current; current = current.previous)
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
