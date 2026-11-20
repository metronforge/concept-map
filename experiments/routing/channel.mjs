import { channelGrid } from "./channel-grid.mjs";
import { shortestChannel } from "./channel-search.mjs";

/** Experimental geometry only; labels and parallel-channel spacing follow later. */
export function routeChannel(problem) {
  return problem.edges.map((edge) => {
    const points = shortestChannel(channelGrid(problem.nodes, edge), edge);
    return points
      ? { id: edge.id, points }
      : { id: edge.id, failure: "no channel path" };
  });
}
