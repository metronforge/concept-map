import type { ResolvedMap } from "../schema.js";
import type { PlayerState } from "./state.js";
export interface LogLine {
  text: string;
  kind: "old" | "new" | "err";
}
export interface Badge {
  x: number;
  y: number;
  n: number;
  current: boolean;
}
export type StepPanel = {
  kind: "step";
  count: string;
  title: string;
  html: string;
  log: LogLine[];
  fix?: string;
  code?: ResolvedMap["code"][string];
  defs: ResolvedMap["definitions"][string][];
  sources: ResolvedMap["scenarios"][number]["steps"][number]["sources"];
  deeper: ResolvedMap["scenarios"][number]["steps"][number]["deeper"];
  canBack: boolean;
  canNext: boolean;
  nextScenario?: string;
};
export type AllPanel = {
  kind: "all";
  count: string;
  title: string;
  text: string;
  steps: string[];
  hasFlowLog: boolean;
};
export interface Frame {
  state: PlayerState;
  nodes: Record<string, { revealed: boolean; current: boolean; label: string }>;
  edges: Record<string, { revealed: boolean; current: boolean }>;
  lanes: Record<string, { revealed: boolean }>;
  frames: Record<string, { revealed: boolean }>;
  edgeLabels: Record<string, { revealed: boolean; lines: string[] }>;
  badges: Badge[];
  panel: StepPanel | AllPanel;
}
export function derive(map: ResolvedMap, state: PlayerState): Frame {
  const s = map.scenarios[state.scenario],
    steps = s.steps,
    all = state.mode === "all";
  const upto = all ? steps.length - 1 : state.step;
  const shown = new Set<string>();
  const first = new Map<string, number>();
  steps.slice(0, upto + 1).forEach((step, i) => {
    step.show.forEach((id) => shown.add(id));
    step.edges.forEach((id) => {
      if (!first.has(id)) first.set(id, i + 1);
    });
  });
  const current = new Set(all ? [] : steps[state.step].current);
  const currentEdges = new Set(all ? [] : steps[state.step].edges);
  const nodes = Object.fromEntries(
    Object.entries(map.nodes).map(([id, node]) => [
      id,
      {
        revealed: shown.has(id),
        current: current.has(id),
        label: s.nodeLabels?.[id] ?? node.label,
      },
    ]),
  );
  const lanes = Object.fromEntries(
    Object.keys(map.lanes).map((id) => [
      id,
      { revealed: [...shown].some((node) => map.nodes[node].lane === id) },
    ]),
  );
  const frames = Object.fromEntries(
    Object.entries(map.frames).map(([id, frame]) => [
      id,
      { revealed: frame.showWith.some((node) => shown.has(node)) },
    ]),
  );
  const edges: Frame["edges"] = {},
    edgeLabels: Frame["edgeLabels"] = {},
    badges: Badge[] = [];
  const repeat = s.repeatBadges ?? [];
  for (const [id, edge] of Object.entries(map.edges)) {
    const revealed = s.display.edges === "all" || first.has(id);
    edges[id] = { revealed, current: currentEdges.has(id) };
    if (edge.label) edgeLabels[id] = { revealed, lines: [edge.label.text] };
    if (
      revealed &&
      edge.badge &&
      (all || s.display.edgeBadges) &&
      first.has(id) &&
      !(
        !all &&
        repeat.some((b) => b.edge === id && b.step === steps[state.step].id)
      )
    ) {
      badges.push({
        x: edge.badge[0],
        y: edge.badge[1],
        n: first.get(id)!,
        current: currentEdges.has(id),
      });
    }
  }
  for (const b of repeat) {
    const index = steps.findIndex((t) => t.id === b.step);
    if ((!all && index !== state.step) || !steps[index]?.edges.includes(b.edge))
      continue;
    badges.push({ x: b.at[0], y: b.at[1], n: index + 1, current: !all });
  }
  if (s.display.nodeBadges)
    steps.forEach((step, i) => {
      if (i > upto || step.edges.length || !step.current.length) return;
      const [x, y, w] = map.nodes[step.current[0]].box;
      badges.push({
        x: x + w - 2,
        y: y + 2,
        n: i + 1,
        current: !all && i === state.step,
      });
    });
  let panel: Frame["panel"];
  if (all)
    panel = {
      kind: "all",
      count: `Whole map · ${steps.length} step${steps.length > 1 ? "s" : ""}`,
      title: s.whole?.title ?? s.label,
      text: `${s.whole?.text ?? "The numbers follow the order of the steps."} Choose a step to walk through it.`,
      steps: steps.map((t) => t.title),
      hasFlowLog: (s.flow ?? []).some((h) => h.log.length > 0),
    };
  else {
    const t = steps[state.step];
    const before =
      t.log?.length && s.display.log !== "cumulative"
        ? steps
            .slice(Math.max(0, state.step - 1), state.step)
            .flatMap((t) => t.log ?? [])
            .slice(-3)
        : [];
    panel = {
      kind: "step",
      count: `${s.display.counterLabel ? s.label + " · " : ""}Step ${state.step + 1} of ${steps.length}`,
      title: t.title,
      html: t.text,
      log: [
        ...before.map((text) => ({ text, kind: "old" as const })),
        ...(t.log ?? []).map((text) => ({
          text,
          kind: text.startsWith("Error") ? ("err" as const) : ("new" as const),
        })),
      ],
      ...(t.fix ? { fix: t.fix } : {}),
      ...(t.code ? { code: map.code[t.code] } : {}),
      defs: t.defs.map((id) => map.definitions[id]),
      sources: t.sources,
      deeper: t.deeper,
      canBack: state.step > 0,
      canNext: state.step < steps.length - 1,
      ...(state.step === steps.length - 1 &&
      state.scenario < map.scenarios.length - 1
        ? { nextScenario: map.scenarios[state.scenario + 1].label }
        : {}),
    };
  }
  return {
    state: { ...state },
    nodes,
    lanes,
    frames,
    edges,
    edgeLabels,
    badges,
    panel,
  };
}
