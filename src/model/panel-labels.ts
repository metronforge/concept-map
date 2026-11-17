import type { ResolvedMap } from "../schema.js";
import type { PlayerState } from "./state.js";

export interface PanelLabel {
  step: number;
  text: string;
}

/** Repeated arrows belong to every step that uses them, in authored order. */
export function panelLabels(
  map: ResolvedMap,
  state: PlayerState,
): PanelLabel[] {
  return map.scenarios[state.scenario].steps.flatMap((step, index) =>
    state.mode !== "all" && state.step !== index
      ? []
      : step.edges.flatMap((id) => {
          const text = map.edges[id].label?.text;
          return text ? [{ step: index + 1, text }] : [];
        }),
  );
}
