import { derivePanel, type StepPanel, type AllPanel } from "./panel.js";
export type { LogLine, StepPanel, AllPanel } from "./panel.js";
import { panelLabels } from "./panel-labels.js";
import type { ResolvedMap } from "../schema.js";
import type { PlayerState } from "./state.js";
export interface Badge {
  x: number;
  y: number;
  n: number;
  current: boolean;
}
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
export function derive(
  map: ResolvedMap,
  state: PlayerState,
  options: { labelsInPanel?: boolean } = {},
): Frame {
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
  const panel = derivePanel(map, state);
  return {
    state: { ...state },
    nodes,
    lanes,
    frames,
    edges,
    edgeLabels,
    badges,
    panel: options.labelsInPanel
      ? { ...panel, arrowLabels: panelLabels(map, state) }
      : panel,
  };
}
