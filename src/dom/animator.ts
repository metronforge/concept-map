import type { FlowPlan, Segment } from "../model/flow.js";
import type { ResolvedMap } from "../schema.js";
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
  constructor(
    readonly tokens: SVGCircleElement[],
    readonly edges: ResolvedMap["edges"],
  ) {}
  play(plan: FlowPlan, hooks: FlowHooks): Playback {
    this.current?.stop();
    const generation = ++this.generation;
    let stopped = false;
    const active = new Set<Animation>();
    const clearStyles = () => {
      if (generation !== this.generation) return;
      this.tokens.forEach((t) => {
        t.style.offsetPath = "";
        t.style.offsetDistance = "";
        t.style.offsetRotate = "";
        t.style.offsetAnchor = "";
        t.style.offsetPosition = "";
        t.style.transform = "";
      });
    };
    const place = ([x, y]: [number, number]) =>
      this.tokens.forEach((t) => {
        t.setAttribute("cx", String(x));
        t.setAttribute("cy", String(y));
        t.setAttribute("visibility", "visible");
      });
    const finished = (async () => {
      try {
        for (let index = 0; index < plan.segments.length; index++) {
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
          let frames: Keyframe[];
          if (segment.type === "pause") {
            place(segment.at);
            frames = [
              { transform: "translate(0px, 0px)" },
              { transform: "translate(0px, 0px)" },
            ];
          } else {
            place([0, 0]);
            if (segment.type === "jump")
              frames = [
                {
                  transform: `translate(${segment.from[0]}px, ${segment.from[1]}px)`,
                },
                {
                  transform: `translate(${segment.to[0]}px, ${segment.to[1]}px)`,
                },
              ];
            else {
              for (const t of this.tokens) {
                t.style.offsetPath = `path("${this.edges[segment.edge].path}")`;
                t.style.offsetRotate = "0deg";
                t.style.offsetAnchor = "0px 0px";
                t.style.offsetPosition = "0px 0px";
              }
              frames = [
                { offsetDistance: segment.reverse ? "100%" : "0%" },
                { offsetDistance: segment.reverse ? "0%" : "100%" },
              ];
            }
          }
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
          place(segment.type === "pause" ? segment.at : segment.to);
          animations.forEach((a) => {
            a.cancel();
            active.delete(a);
          });
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
      }
    })();
    return (this.current = {
      finished,
      stop() {
        stopped = true;
        active.forEach((a) => a.cancel());
        active.clear();
        clearStyles();
      },
    });
  }
}
