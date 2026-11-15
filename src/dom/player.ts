import type { ResolvedMap } from "../schema.js";
import {
  initialState,
  reduce,
  type PlayerState,
  type Action,
} from "../model/state.js";
import { derive, type LogLine } from "../model/frame.js";
import { planFlow, reducedFlow, appendLog } from "../model/flow.js";
import type { UiStrings } from "../render/panel.js";
import { SvgDom } from "./svgDom.js";
import { PanelDom } from "./panelDom.js";
import { geometry, sizeLabels, type Geometry } from "./geometry.js";
import { WebAnimator, type Animator, type Playback } from "./animator.js";
const bindings = new WeakMap<MapPlayer, Set<() => void>>();
export class MapPlayer {
  private current: PlayerState = { ...initialState };
  private readonly abort = new AbortController();
  private readonly svg: SvgDom;
  private readonly panel: PanelDom;
  private readonly geo: Geometry;
  private readonly animator: Animator;
  readonly reducedMotion: boolean;
  private readonly resize: ResizeObserver;
  private playback?: Playback;
  private flowId = 0;
  private log: LogLine[] = [];
  private destroyed = false;
  constructor(
    readonly root: HTMLElement,
    readonly map: ResolvedMap,
    options: {
      animator?: Animator;
      geometry?: Geometry;
      reducedMotion?: boolean;
      strings?: Partial<UiStrings>;
    } = {},
  ) {
    if (map.format !== 3)
      throw new Error(
        `Unsupported concept map format ${map.format}; expected 3`,
      );
    const view = root.ownerDocument.defaultView!;
    this.svg = new SvgDom(root.querySelector<SVGSVGElement>(".map svg")!);
    this.panel = new PanelDom(root, options.strings);
    this.geo = options.geometry ?? geometry(this.svg.svg);
    this.animator =
      options.animator ?? new WebAnimator(this.svg.tokens, map.edges);
    this.reducedMotion =
      options.reducedMotion ??
      view.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bindings.set(this, new Set());
    root.addEventListener("click", this.click, { signal: this.abort.signal });
    root.addEventListener("keydown", this.key, { signal: this.abort.signal });
    view.addEventListener(
      "pagehide",
      () => {
        const before = this.current;
        this.stopFlow();
        this.current = { ...this.current, scenario: 0, step: 0 };
        this.emitChange(before);
      },
      { signal: this.abort.signal },
    );
    view.addEventListener(
      "pageshow",
      (event) => {
        if (event.persisted) this.dispatch({ type: "reset" });
      },
      { signal: this.abort.signal },
    );
    const fit = () => {
      if (!this.destroyed) sizeLabels(root, map, this.geo);
    };
    this.resize = new ResizeObserver(fit);
    this.resize.observe(this.svg.svg);
    this.render();
    fit();
    void root.ownerDocument.fonts.ready.then(fit);
  }
  get state(): PlayerState {
    return { ...this.current };
  }
  dispatch(action: Action) {
    if (
      this.destroyed ||
      (action.type === "mode" && action.mode === this.current.mode)
    )
      return;
    const before = this.current;
    this.current = reduce(this.map, this.current, action);
    this.render();
    const generation = this.flowId;
    this.emitChange(before);
    // Listeners may destroy the player or supersede this dispatch.
    if (
      !this.destroyed &&
      generation === this.flowId &&
      this.current.mode === "all"
    )
      this.startFlow();
  }
  highlight(nodes: string[], on: boolean) {
    if (!this.destroyed) this.svg.highlight(nodes, on);
  }
  replay() {
    if (this.destroyed || this.current.mode !== "all") return;
    this.stopFlow();
    this.startFlow();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopFlow();
    this.abort.abort();
    this.resize.disconnect();
    for (const cleanup of bindings.get(this) ?? []) cleanup();
    bindings.delete(this);
  }
  private emitChange(before: PlayerState) {
    if (
      before.scenario !== this.current.scenario ||
      before.step !== this.current.step ||
      before.mode !== this.current.mode
    )
      this.root.dispatchEvent(
        new CustomEvent("mapchange", { detail: this.state, bubbles: true }),
      );
  }
  private readonly click = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLElement>(
      "[data-scenario], [data-mode], [data-seg], [data-go], [data-role]",
    );
    if (!button || !this.root.contains(button) || button.matches(":disabled"))
      return;
    if (button.dataset.scenario !== undefined)
      this.dispatch({
        type: "scenario",
        index: this.map.scenarios.findIndex(
          (s) => s.id === button.dataset.scenario,
        ),
      });
    else if (button.dataset.mode === "step" || button.dataset.mode === "all")
      this.dispatch({ type: "mode", mode: button.dataset.mode });
    else if (button.dataset.seg !== undefined)
      this.dispatch({ type: "go", step: Number(button.dataset.seg) });
    else if (button.dataset.go !== undefined)
      this.dispatch({
        type: "concept",
        scenario: this.current.scenario,
        step: Number(button.dataset.go),
      });
    else if (button.dataset.role === "back") this.dispatch({ type: "back" });
    else if (button.dataset.role === "next") this.dispatch({ type: "next" });
    else if (button.dataset.role === "replay") this.replay();
    else if (button.dataset.role === "nextscenario") {
      event.preventDefault();
      this.dispatch({ type: "scenario", index: this.current.scenario + 1 });
    }
  };
  private readonly key = (event: KeyboardEvent) => {
    if (
      this.current.mode !== "step" ||
      (event.target instanceof Element &&
        event.target.closest("input, textarea, select"))
    )
      return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      this.dispatch({ type: event.key === "ArrowRight" ? "next" : "back" });
    }
  };
  private render() {
    this.stopFlow();
    const frame = derive(this.map, this.current);
    this.svg.applyFrame(frame);
    this.panel.applyFrame(this.map, frame);
    this.root
      .querySelectorAll<HTMLElement>("[data-scenario]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(
            b.dataset.scenario === this.map.scenarios[this.current.scenario].id,
          ),
        ),
      );
    this.root
      .querySelectorAll<HTMLElement>("[data-mode]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.mode === this.current.mode),
        ),
      );
  }
  private stopFlow() {
    this.flowId++;
    this.playback?.stop();
    this.playback = undefined;
    this.svg.clearFlow();
  }
  private startFlow() {
    const scenario = this.current.scenario,
      story = this.map.scenarios[scenario];
    this.log = [];
    this.panel.setLog([]);
    if (!story.flow?.length) return;
    this.svg.clearFlow();
    if (this.reducedMotion) {
      const flow = reducedFlow(this.map, scenario);
      this.svg.applyReduced(flow);
      this.panel.setLog(flow.log);
      this.panel.markStep(flow.lastStep);
      return;
    }
    const generation = ++this.flowId,
      active = () => !this.destroyed && generation === this.flowId;
    this.svg.tokenFailure(false);
    const plan = planFlow(this.map, scenario, {
      length: (id) => this.geo.pathLength(id),
    });
    let pendingHop: number | undefined;
    const finishHop = (index: number) => {
      const h = plan.hops[index],
        node = this.svg.nodes[h.node];
      node.classList.remove("oknow");
      if (!h.fail) node.classList.remove("failnow");
      this.svg.tokenFailure(false);
      if (pendingHop === index) pendingHop = undefined;
    };
    this.playback = this.animator.play(plan, {
      onHopStart: (i) => {
        if (active()) this.panel.markStep(plan.hops[i].step);
      },
      onSegment: (segment) => {
        if (active() && segment.type === "travel")
          this.svg.edges[segment.edge].classList.add("trail");
      },
      onHop: (i) => {
        if (!active()) return;
        // Required hooks alone must leave a complete route, even when an
        // injected animator does not report optional intermediate phases.
        if (pendingHop !== undefined) finishHop(pendingHop);
        pendingHop = i;
        this.panel.markStep(plan.hops[i].step);
        const edge = story.flow![i].edge;
        if (edge) this.svg.edges[edge].classList.add("trail");
        const h = plan.hops[i],
          node = this.svg.nodes[h.node];
        node.classList.add("visit", h.fail ? "failnow" : "oknow");
        this.svg.tokenFailure(h.fail);
        this.log = appendLog(this.log, h.log);
        this.panel.setLog(this.log);
      },
      onHopEnd: (i) => {
        if (active()) finishHop(i);
      },
      onDone: () => {
        if (active()) {
          if (pendingHop !== undefined) finishHop(pendingHop);
          this.svg.hideToken();
          this.playback = undefined;
        }
      },
    });
    void this.playback.finished.catch((error) => {
      if (active()) throw error;
    });
  }
}
export function connectConcepts(
  player: MapPlayer,
  container: HTMLElement,
): () => void {
  if (!bindings.has(player)) return () => {};
  const abort = new AbortController(),
    signal = abort.signal;
  for (const row of container.querySelectorAll<HTMLElement>("li[data-nodes]")) {
    const highlight = (on: boolean) =>
      player.highlight(row.dataset.nodes!.split(" "), on);
    row.addEventListener("mouseenter", () => highlight(true), { signal });
    row.addEventListener("mouseleave", () => highlight(false), { signal });
    row.addEventListener("focusin", () => highlight(true), { signal });
    row.addEventListener("focusout", () => highlight(false), { signal });
    row.querySelector<HTMLElement>("[data-step]")?.addEventListener(
      "click",
      (event) => {
        const button = event.currentTarget as HTMLElement;
        const scenario = Math.max(
          0,
          player.map.scenarios.findIndex(
            (s) =>
              s.id ===
              (button.dataset.conceptScenario ?? player.map.conceptScenario),
          ),
        );
        const step = Number(button.dataset.step);
        player.dispatch({ type: "concept", scenario, step });
        player.root
          .querySelector<HTMLElement>(`[data-seg="${player.state.step}"]`)
          ?.focus({ preventScroll: true });
        player.root.scrollIntoView({
          behavior: player.reducedMotion ? "auto" : "smooth",
          block: "start",
        });
      },
      { signal },
    );
  }
  const cleanup = () => {
    abort.abort();
    bindings.get(player)?.delete(cleanup);
  };
  bindings.get(player)!.add(cleanup);
  return cleanup;
}
