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
import { bindings } from "./bindings.js";
import { refineDrawing } from "./refine.js";
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
  private panelLabels = false;
  constructor(
    readonly root: HTMLElement,
    private drawnMap: ResolvedMap,
    options: {
      animator?: Animator;
      geometry?: Geometry;
      reducedMotion?: boolean;
      strings?: Partial<UiStrings>;
    } = {},
  ) {
    const map = drawnMap;
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
    this.listen(view);
    const fit = () => this.fit(map);
    this.resize = new ResizeObserver(fit);
    this.resize.observe(this.svg.svg);
    this.resize.observe(this.svg.svg.parentElement!);
    this.render();
    void root.ownerDocument.fonts.ready.then(fit);
    root.ownerDocument.fonts.addEventListener("loadingdone", fit, {
      signal: this.abort.signal,
    });
  }
  private switchedAt?: number;
  private fit(map: ResolvedMap) {
    if (this.destroyed) return;
    const result = refineDrawing(
      this.root,
      map,
      this.geo,
      this.svg,
      this.current,
      this.switchedAt,
    );
    this.drawnMap = result.map;
    if (this.animator instanceof WebAnimator)
      this.animator.retarget(this.map, this.current.scenario);
    this.switchedAt = result.choice.switchedAt;
    const panel = result.choice.presentation === "panel";
    if (this.panelLabels !== panel) {
      this.panelLabels = panel;
      this.panel.refreshLabels(
        derive(this.map, this.current, {
          labelsInPanel: this.panelLabels,
        }),
      );
    }
  }
  private listen(view: Window) {
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
  }
  get map(): ResolvedMap {
    return this.drawnMap;
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
    const frame = derive(this.map, this.current, {
      labelsInPanel: this.panelLabels,
    });
    this.svg.applyFrame(frame);
    this.panel.applyFrame(this.map, frame);
    sizeLabels(this.root, this.map, this.geo);
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
