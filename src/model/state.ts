import type { ResolvedMap } from "../schema.js";
export type Mode = "step" | "all";
export interface PlayerState {
  scenario: number;
  step: number;
  mode: Mode;
}
export const initialState: Readonly<PlayerState> = {
  scenario: 0,
  step: 0,
  mode: "step",
};
export type Action =
  | { type: "next" }
  | { type: "back" }
  | { type: "go"; step: number }
  | { type: "scenario"; index: number }
  | { type: "mode"; mode: Mode }
  | { type: "concept"; scenario: number; step: number }
  | { type: "reset" };
const clamp = (n: number, count: number) => Math.max(0, Math.min(count - 1, n));
export function reduce(
  map: ResolvedMap,
  s: PlayerState,
  a: Action,
): PlayerState {
  switch (a.type) {
    case "reset":
      return { ...initialState };
    case "mode":
      return { ...s, mode: a.mode };
    case "scenario":
      return { ...s, scenario: clamp(a.index, map.scenarios.length), step: 0 };
    case "concept": {
      const scenario = clamp(a.scenario, map.scenarios.length);
      return {
        scenario,
        step: clamp(a.step, map.scenarios[scenario].steps.length),
        mode: "step",
      };
    }
    default:
      return {
        ...s,
        step: clamp(
          a.type === "go" ? a.step : s.step + (a.type === "next" ? 1 : -1),
          map.scenarios[s.scenario].steps.length,
        ),
      };
  }
}
