import { channelGrid } from "./channel-grid.js";
import { shortestChannel } from "./channel-search.js";
import { spaceChannels } from "./channel-spacing.js";

type Edge = Parameters<typeof channelGrid>[1] & { id: string };
type Problem = {
  nodes: Parameters<typeof channelGrid>[0];
  edges: Edge[];
  viewBox?: [number, number];
};

/** Find independent paths, then assign ordered tracks when all paths exist. */
export function routeChannel(problem: Problem) {
  const routes = problem.edges.map((edge) => {
    const points = shortestChannel(
      channelGrid(problem.nodes, edge, problem.viewBox),
      edge,
    );
    return points
      ? { id: edge.id, points }
      : { id: edge.id, failure: "no channel path" };
  });
  if (problem.viewBox && routes.every((route) => route.points)) {
    return spaceChannels(
      { ...problem, viewBox: problem.viewBox, nodes: [...problem.nodes] },
      routes as { id: string; points: number[][] }[],
    );
  }
  return routes;
}
