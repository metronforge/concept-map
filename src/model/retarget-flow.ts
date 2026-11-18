import type { ResolvedMap } from "../schema.js";
import { jumpSegment, type FlowPlan } from "./flow.js";
import { pathEnds, type Point } from "./path.js";

/** Move the same playback phases to new geometry, retaining timing and hooks.
 * Keep even zero-length jumps: adding/removing phases would move the playhead. */
export function retargetFlow(
  plan: FlowPlan,
  map: ResolvedMap,
  scenario: number,
): FlowPlan {
  const flow = map.scenarios[scenario].flow ?? [];
  if (!flow.length) return plan;
  const center = (id: string): Point => {
    const [x, y, w, h] = map.nodes[id].box;
    return [x + w / 2, y + h / 2];
  };
  const segments = [...plan.segments];
  let position = center(flow[0].node);
  segments[0] = { ...segments[0], type: "pause", at: position };
  plan.hops.forEach((hop, i) => {
    const step = flow[i];
    const target = jumpSegment(position, center(step.node))?.to ?? position;
    const ends = step.edge
      ? pathEnds(map.edges[step.edge].path)
      : [target, target];
    const [from, to] = step.reverse ? [ends[1], ends[0]] : ends;
    const start = i ? plan.hops[i - 1].segment + 1 : 1;
    for (let index = start; index <= hop.segment; index++) {
      const segment = segments[index];
      segments[index] =
        segment.type === "pause"
          ? { ...segment, at: to }
          : {
              ...segment,
              from: segment.type === "jump" ? position : from,
              to: segment.type === "jump" ? from : to,
            };
    }
    position = to;
  });
  return { ...plan, segments };
}
