import type { ResolvedMap } from "../schema.js";
import type { LogLine } from "./frame.js";
import { pathEnds, type Point } from "./path.js";
export type Segment =
  | { type: "pause"; duration: number; at: Point }
  | { type: "jump"; duration: number; from: Point; to: Point }
  | {
      type: "travel";
      duration: number;
      edge: string;
      reverse: boolean;
      from: Point;
      to: Point;
    };
export interface FlowPlan {
  segments: Segment[];
  hops: {
    startSegment: number;
    segment: number;
    step: number;
    node: string;
    log: string[];
    fail: boolean;
  }[];
}
export function planFlow(
  map: ResolvedMap,
  scenario: number,
  geo: { length(edge: string): number },
): FlowPlan {
  const s = map.scenarios[scenario],
    flow = s.flow ?? [];
  const plan: FlowPlan = { segments: [], hops: [] };
  if (!flow.length) return plan;
  const center = (id: string): Point => {
    const [x, y, w, h] = map.nodes[id].box;
    return [x + w / 2, y + h / 2];
  };
  let pos = center(flow[0].node);
  plan.segments.push({ type: "pause", duration: 400, at: pos });
  const jump = (to: Point) => {
    const segment = jumpSegment(pos, to);
    if (!segment) return;
    plan.segments.push(segment);
    pos = to;
  };
  for (const h of flow) {
    const startSegment = plan.segments.length;
    if (h.edge) {
      const ends = pathEnds(map.edges[h.edge].path);
      const [from, to] = h.reverse ? [ends[1], ends[0]] : ends;
      jump(from);
      plan.segments.push({
        type: "travel",
        duration: Math.max(220, geo.length(h.edge) / 0.28),
        edge: h.edge,
        reverse: !!h.reverse,
        from,
        to,
      });
      pos = to;
    } else jump(center(h.node));
    plan.hops.push({
      startSegment,
      segment: plan.segments.length,
      step: s.steps.findIndex((t) => t.id === h.step),
      node: h.node,
      log: h.log,
      fail: !!h.fail,
    });
    plan.segments.push({
      type: "pause",
      duration: h.fail ? 750 : 280,
      at: pos,
    });
  }
  return plan;
}
export function appendLog(previous: LogLine[], lines: string[]): LogLine[] {
  return [
    ...previous.map((l) => ({ text: l.text, kind: "old" as const })),
    ...lines.map((text) => ({
      text,
      kind: text.startsWith("Error") ? ("err" as const) : ("new" as const),
    })),
  ];
}
export function reducedFlow(
  map: ResolvedMap,
  scenario: number,
): {
  trail: string[];
  visited: string[];
  failed: string[];
  log: LogLine[];
  lastStep: number;
} {
  const s = map.scenarios[scenario];
  const trail = new Set<string>(),
    visited = new Set<string>(),
    failed = new Set<string>();
  let log: LogLine[] = [],
    lastStep = -1;
  for (const h of s.flow ?? []) {
    if (h.edge) trail.add(h.edge);
    (h.fail ? failed : visited).add(h.node);
    log = appendLog(log, h.log);
    lastStep = s.steps.findIndex((t) => t.id === h.step);
  }
  return {
    trail: [...trail],
    visited: [...visited],
    failed: [...failed],
    log,
    lastStep,
  };
}

/** The same short-jump rule applies when initially planning and retargeting. */
export function jumpSegment(
  from: Point,
  to: Point,
): Extract<Segment, { type: "jump" }> | undefined {
  const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return distance < 2
    ? undefined
    : {
        type: "jump",
        duration: Math.max(120, distance / 0.28),
        from,
        to,
      };
}
