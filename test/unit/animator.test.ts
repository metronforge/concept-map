import { expect, test, vi } from "vitest";
import { WebAnimator } from "../../src/dom/animator";
import { planFlow } from "../../src/model/flow";
import { resolvedFixture } from "./arbitraries/map";
class FakeAnimation {
  finished: Promise<void>;
  resolve!: () => void;
  reject!: (e: Error) => void;
  settled = false;
  cancelled = false;
  constructor(
    public frames: Keyframe[],
    readonly options: KeyframeAnimationOptions,
  ) {
    this.finished = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  currentTime = 75;
  effect = {
    setKeyframes: (frames: Keyframe[]) => {
      this.frames = frames;
    },
  };
  finish() {
    if (!this.settled) {
      this.settled = true;
      this.resolve();
    }
  }
  cancel() {
    this.cancelled = true;
    if (!this.settled) {
      this.settled = true;
      this.reject(new Error("cancelled"));
    }
  }
}
class FakeToken {
  style: Record<string, string> = {};
  attrs = new Map<string, string>();
  animations: FakeAnimation[] = [];
  setAttribute(key: string, value: string) {
    this.attrs.set(key, value);
  }
  animate(frames: Keyframe[], options: KeyframeAnimationOptions) {
    const a = new FakeAnimation(frames, options);
    this.animations.push(a);
    return a;
  }
}
function setup() {
  const map = resolvedFixture(),
    tokens = [new FakeToken(), new FakeToken()];
  return {
    map,
    tokens,
    animator: new WebAnimator(
      tokens as unknown as SVGCircleElement[],
      map.edges,
    ),
  };
}
async function drain(tokens: FakeToken[], done: () => boolean) {
  for (let i = 0; i < 100 && !done(); i++) {
    tokens.forEach((t) => t.animations.forEach((a) => a.finish()));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }
  expect(done()).toBe(true);
}
test("animator exposes step-start, travel, arrival and dwell-end in the old order", async () => {
  const { map, tokens, animator } = setup(),
    events: string[] = [];
  let done = false;
  const playback = animator.play(planFlow(map, 0, { length: () => 60 }), {
    onHopStart: (i) => events.push(`start:${i}`),
    onHop: (i) => events.push(`hop:${i}`),
    onSegment: (s) => {
      if (s.type === "travel") events.push(`travel:${s.edge}`);
    },
    onHopEnd: (i) => events.push(`end:${i}`),
    onDone: () => {
      events.push("done");
      done = true;
    },
  });
  await drain(tokens, () => done);
  await playback.finished;
  expect(events).toEqual([
    "start:0",
    "hop:0",
    "end:0",
    "start:1",
    "travel:ab",
    "hop:1",
    "end:1",
    "done",
  ]);
  expect(tokens[0].animations.map((a) => a.options.duration)).toEqual([
    400, 280, 120, 220, 280,
  ]);
  expect(tokens[0].attrs.get("cx")).toBe("35");
  expect(tokens[0].attrs.get("cy")).toBe("100");
  expect(tokens[0].animations.every((a) => a.cancelled)).toBe(true);
});
test("stop cancels both token animations and prevents later hooks", async () => {
  const { map, tokens, animator } = setup(),
    onDone = vi.fn(),
    onHop = vi.fn();
  const playback = animator.play(planFlow(map, 0, { length: () => 60 }), {
    onHop,
    onDone,
  });
  playback.stop();
  await playback.finished;
  expect(onDone).not.toHaveBeenCalled();
  expect(onHop).not.toHaveBeenCalled();
  expect(tokens.flatMap((t) => t.animations).every((a) => a.cancelled)).toBe(
    true,
  );
});
test("reverse travel animates distance from 100% to 0% on the authored path", async () => {
  const { map, tokens, animator } = setup();
  let done = false;
  map.scenarios[0].flow = [
    { edge: "ab", reverse: true, node: "a", step: "end", log: [] },
  ];
  const playback = animator.play(planFlow(map, 0, { length: () => 60 }), {
    onHop() {},
    onDone() {
      done = true;
    },
  });
  await drain(tokens, () => done);
  await playback.finished;
  const travel = tokens[0].animations.find(
    (a) => "offsetDistance" in a.frames[0],
  )!;
  expect(travel.frames).toEqual([
    { offsetDistance: "100%" },
    { offsetDistance: "0%" },
  ]);
  expect(tokens[0].style.offsetPath).toBe("");
});

test("a cancelled playback cannot clear the next playback's path styles", async () => {
  const { map, tokens, animator } = setup();
  const first = animator.play(planFlow(map, 0, { length: () => 60 }), {
    onHop() {},
    onDone() {},
  });
  first.stop();
  const next = animator.play(
    {
      segments: [
        {
          type: "travel",
          edge: "ab",
          reverse: false,
          from: [35, 40],
          to: [35, 100],
          duration: 220,
        },
      ],
      hops: [],
    },
    { onHop() {}, onDone() {} },
  );
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(tokens[0].style.offsetPath).toBe('path("M35 40 V100")');
  next.stop();
  await Promise.all([first.finished, next.finished]);
});

for (const reverse of [false, true])
  for (const phase of [0, 1, 2, 3, 4])
    test(`retargets phase ${phase}, reverse=${reverse}, without replaying hooks`, async () => {
      const { map, tokens, animator } = setup();
      map.scenarios[0].flow![1].reverse = reverse;
      const plan = planFlow(map, 0, { length: () => 60 });
      const events: string[] = [];
      let done = false;
      const playback = animator.play(plan, {
        onHopStart: (i) => events.push(`start:${i}`),
        onHop: (i) => events.push(`hop:${i}`),
        onHopEnd: (i) => events.push(`end:${i}`),
        onDone: () => {
          done = true;
        },
      });
      for (let n = 0; tokens[0].animations.length <= phase && n < 30; n++) {
        tokens.forEach((t) => t.animations.at(-1)!.finish());
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      }
      const animations = tokens.map((t) => t.animations.at(-1)!);
      const before = [...events];
      const next = structuredClone(map);
      next.nodes.a.box = [50, 60, 80, 50];
      next.edges.ab.path = "M90 110 L250 160";
      animator.retarget(next, 0);
      expect(events).toEqual(before);
      for (const [i, token] of tokens.entries()) {
        expect(token.animations).toHaveLength(phase + 1);
        expect(token.animations.at(-1)).toBe(animations[i]);
        expect(animations[i].currentTime).toBe(75);
        expect(animations[i].cancelled).toBe(false);
        if (phase < 2) {
          expect(token.attrs.get("cx")).toBe("90");
          expect(token.attrs.get("cy")).toBe("85");
        } else if (phase === 2) {
          expect(animations[i].frames).toEqual([
            { transform: "translate(90px, 85px)" },
            {
              transform: reverse
                ? "translate(250px, 160px)"
                : "translate(90px, 110px)",
            },
          ]);
        } else if (phase === 3) {
          expect(token.style.offsetPath).toBe('path("M90 110 L250 160")');
          expect(animations[i].frames).toEqual([
            { offsetDistance: reverse ? "100%" : "0%" },
            { offsetDistance: reverse ? "0%" : "100%" },
          ]);
        } else {
          expect(token.attrs.get("cx")).toBe(reverse ? "90" : "250");
          expect(token.attrs.get("cy")).toBe(reverse ? "110" : "160");
        }
      }
      await drain(tokens, () => done);
      await playback.finished;
      expect(events).toEqual([
        "start:0",
        "hop:0",
        "end:0",
        "start:1",
        "hop:1",
        "end:1",
      ]);
      expect(tokens[0].attrs.get("cx")).toBe(reverse ? "90" : "250");
      expect(tokens[0].attrs.get("cy")).toBe(reverse ? "110" : "160");
      expect(tokens[0].animations.map((a) => a.options.duration)).toEqual(
        plan.segments.map((s) => s.duration),
      );
      const after = tokens.map((t) => ({ ...t.style }));
      animator.retarget(map, 0);
      expect(tokens.map((t) => ({ ...t.style }))).toEqual(after);
    });

test("stopping an older playback cannot remove the current retarget callback", async () => {
  const { map, tokens, animator } = setup();
  const plan = planFlow(map, 0, { length: () => 60 });
  const hooks = { onHop: vi.fn(), onDone: vi.fn() };
  const first = animator.play(plan, hooks);
  first.stop();
  const stopped = tokens.map((token) => ({ ...token.style }));
  animator.retarget(map, 0);
  expect(tokens.map((token) => ({ ...token.style }))).toEqual(stopped);
  const second = animator.play(plan, hooks);
  first.stop();
  await first.finished;
  const next = structuredClone(map);
  next.nodes.a.box = [50, 60, 80, 50];
  animator.retarget(next, 0);
  expect(tokens[0].attrs.get("cx")).toBe("90");
  expect(tokens[0].attrs.get("cy")).toBe("85");
  expect(tokens[0].animations.at(-1)!.cancelled).toBe(false);
  second.stop();
  await second.finished;
  expect(hooks.onHop).not.toHaveBeenCalled();
  expect(hooks.onDone).not.toHaveBeenCalled();
  expect(
    tokens
      .flatMap((token) => token.animations)
      .every((animation) => animation.cancelled),
  ).toBe(true);
});
