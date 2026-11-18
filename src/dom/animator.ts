import type { FlowPlan, Segment } from "../model/flow.js";
import type { ResolvedMap } from "../schema.js";
import { retargetFlow } from "../model/retarget-flow.js";
import { clearTokenStyles, placeTokens, tokenFrames } from "./token.js";
export interface Playback {
  stop(): void;
  readonly finished: Promise<void>;
}
export interface FlowHooks {
  onHop(i: number): void;
  onDone(): void;
  onHopStart?(i: number): void;
  onSegment?(segment: Segment): void;
  onHopEnd?(i: number): void;
}
export interface Animator {
  play(plan: FlowPlan, hooks: FlowHooks): Playback;
}
export class WebAnimator implements Animator {
  private generation = 0;
  private current?: Playback;
  private retargetCurrent?: (map: ResolvedMap, scenario: number) => void;
  retarget(map: ResolvedMap, scenario: number) {
    this.edges = map.edges;
    this.retargetCurrent?.(map, scenario);
  }
  constructor(
    readonly tokens: SVGCircleElement[],
    private edges: ResolvedMap["edges"],
  ) {}
  play(plan: FlowPlan, hooks: FlowHooks): Playback {
    this.current?.stop();
    const generation = ++this.generation;
    let stopped = false;
    const active = new Set<Animation>();
    const clearStyles = () => {
      if (generation !== this.generation) return;
      clearTokenStyles(this.tokens);
    };
    let index = 0;
    this.retargetCurrent = (map, scenario) => {
      plan = retargetFlow(plan, map, scenario);
      const frames = tokenFrames(this.tokens, plan.segments[index], this.edges);
      active.forEach((animation) =>
        (animation.effect as KeyframeEffect).setKeyframes(frames),
      );
    };
    const animate = async (segment: Segment) => {
      const frames = tokenFrames(this.tokens, segment, this.edges);
      const animations = this.tokens.map((t) =>
        t.animate(frames, {
          duration: segment.duration,
          fill: "forwards",
          easing: "linear",
        }),
      );
      animations.forEach((a) => active.add(a));
      await Promise.all(animations.map((a) => a.finished));
      if (stopped) return;
      clearStyles();
      const end = plan.segments[index];
      placeTokens(this.tokens, end.type === "pause" ? end.at : end.to);
      animations.forEach((a) => {
        a.cancel();
        active.delete(a);
      });
    };
    const finished = (async () => {
      try {
        for (; index < plan.segments.length; index++) {
          if (stopped) return;
          const segment = plan.segments[index];
          plan.hops.forEach((hop, i) => {
            if (hop.startSegment === index) hooks.onHopStart?.(i);
          });
          hooks.onSegment?.(segment);
          plan.hops.forEach((hop, i) => {
            if (hop.segment === index) hooks.onHop(i);
          });
          clearStyles();
          await animate(segment);
          if (stopped) return;
          plan.hops.forEach((hop, i) => {
            if (hop.segment === index) hooks.onHopEnd?.(i);
          });
        }
        if (!stopped) hooks.onDone();
      } catch (error) {
        if (!stopped) throw error;
      } finally {
        active.forEach((a) => a.cancel());
        active.clear();
        clearStyles();
        if (generation === this.generation) this.retargetCurrent = undefined;
      }
    })();
    return (this.current = {
      finished,
      stop: () => {
        stopped = true;
        if (generation === this.generation) this.retargetCurrent = undefined;
        active.forEach((a) => a.cancel());
        active.clear();
        clearStyles();
      },
    });
  }
}
