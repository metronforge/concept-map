import { channelGrid } from "./channel-grid.mjs";
import { shortestChannel } from "./channel-search.mjs";

/** Independent shortest paths, retained as the input to the spacing diagnostics. */
export function routeIndependent(problem) {
  return problem.edges.map((edge) => {
    const points = shortestChannel(
      channelGrid(problem.nodes, edge, problem.viewBox),
      edge,
    );
    return points
      ? { id: edge.id, points }
      : { id: edge.id, failure: "no channel path" };
  });
}
