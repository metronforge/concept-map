import type { ResolvedMap } from "../schema.js";
import type { PlayerState } from "./state.js";
import type { PanelLabel } from "./panel-labels.js";
export interface LogLine {
  text: string;
  kind: "old" | "new" | "err";
}

export type StepPanel = {
  kind: "step";
  arrowLabels?: PanelLabel[];
  count: string;
  title: string;
  text: string;
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
  arrowLabels?: PanelLabel[];
  count: string;
  title: string;
  text: string;
  steps: string[];
  hasFlowLog: boolean;
};

export function derivePanel(
  map: ResolvedMap,
  state: PlayerState,
): StepPanel | AllPanel {
  const s = map.scenarios[state.scenario],
    steps = s.steps,
    all = state.mode === "all";
  if (all)
    return {
      kind: "all",
      count: `Whole map · ${steps.length} step${steps.length > 1 ? "s" : ""}`,
      title: s.whole?.title ?? s.label,
      text: `${s.whole?.text ?? "The numbers follow the order of the steps."} Choose a step to walk through it.`,
      steps: steps.map((t) => t.title),
      hasFlowLog: (s.flow ?? []).some((h) => h.log.length > 0),
    };
  return stepPanel(map, state);
}

function stepPanel(map: ResolvedMap, state: PlayerState): StepPanel | AllPanel {
  const s = map.scenarios[state.scenario],
    steps = s.steps;
  const t = steps[state.step];
  return {
    kind: "step",
    count: `${s.display.counterLabel ? s.label + " · " : ""}Step ${state.step + 1} of ${steps.length}`,
    title: t.title,
    text: t.text,
    log: stepLog(s, state.step),
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

function stepLog(
  s: ResolvedMap["scenarios"][number],
  index: number,
): LogLine[] {
  const steps = s.steps,
    t = steps[index];
  const before =
    t.log?.length && s.display.log !== "cumulative"
      ? steps
          .slice(Math.max(0, index - 1), index)
          .flatMap((t) => t.log ?? [])
          .slice(-3)
      : [];
  return [
    ...before.map((text) => ({ text, kind: "old" as const })),
    ...(t.log ?? []).map((text) => ({
      text,
      kind: text.startsWith("Error") ? ("err" as const) : ("new" as const),
    })),
  ];
}
