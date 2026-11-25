import { routeIndependent } from "./channel-independent.mjs";
import { spaceChannels } from "./channel-spacing.mjs";

/** Experimental geometry: independent paths followed by ordered track spacing. */
export function routeChannel(problem) {
  const routes = routeIndependent(problem);
  return problem.viewBox && routes.every((route) => route.points)
    ? spaceChannels(problem, routes)
    : routes;
}
