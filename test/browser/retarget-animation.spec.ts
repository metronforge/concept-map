import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ResolvedMapSchema } from "../../src/schema";

for (const reverse of [false, true])
  test(`geometry changes preserve token position along each phase, reverse=${reverse}`, async ({
    page,
  }) => {
    const map = ResolvedMapSchema.parse(
      JSON.parse(readFileSync("test/fixtures/map.json", "utf8")),
    );
    map.scenarios[0].flow![1].reverse = reverse;
    await page.goto("/integration/");
    const result = await page.evaluate(
      async ({ map, reverse }) => {
        const { renderFigure, SvgDom, WebAnimator, planFlow, derive } =
          await import("/assets/integration.js");
        document.body.innerHTML = renderFigure(map);
        const svg = new SvgDom(document.querySelector(".map svg")!);
        const animator = new WebAnimator(svg.tokens, map.edges);
        const state = { scenario: 0, step: 1, mode: "all" as const };
        svg.applyFrame(derive(map, state));
        const button =
          document.querySelector<HTMLButtonElement>("[data-role=next]")!;
        button.focus();
        const next = structuredClone(map);
        next.nodes.a.box = [50, 60, 80, 50];
        next.nodes.b.box = [200, 160, 100, 60];
        next.edges.ab.path = "M90 110 L250 160";
        const plan = planFlow(map, 0, { length: () => 60 });
        plan.segments.forEach((segment) => {
          segment.duration = 10000;
        });
        const events: string[] = [];
        const playback = animator.play(plan, {
          onHopStart: (i) => events.push(`start:${i}`),
          onHop: (i) => events.push(`hop:${i}`),
          onHopEnd: (i) => events.push(`end:${i}`),
          onDone: () => events.push("done"),
        });
        const frame = () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
        const positions = () =>
          svg.tokens.map((token) => {
            const rect = token.getBoundingClientRect();
            const point = new DOMPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            ).matrixTransform(svg.svg.getScreenCTM()!.inverse());
            return [point.x, point.y];
          });
        const phases = [];
        for (let phase = 0; phase < plan.segments.length; phase++) {
          const animations = svg.tokens.map(
            (token) => token.getAnimations()[0],
          );
          animations.forEach((animation) => {
            animation.pause();
            animation.currentTime = 2500;
          });
          await frame();
          const before = positions();
          const beforeEvents = [...events];
          svg.applyGeometry(next);
          svg.applyFrame(derive(next, state));
          animator.retarget(next, 0);
          await frame();
          const changed = positions();
          const preserved = animations.every(
            (animation, i) =>
              svg.tokens[i].getAnimations()[0] === animation &&
              animation.currentTime === 2500 &&
              animation.playState === "paused",
          );
          svg.applyGeometry(map);
          svg.applyFrame(derive(map, state));
          animator.retarget(map, 0);
          await frame();
          phases.push({
            before,
            changed,
            restored: positions(),
            preserved,
            sameEvents: JSON.stringify(events) === JSON.stringify(beforeEvents),
            focused: document.activeElement === button,
          });
          animations.forEach((animation) => animation.finish());
          // Let both finished promises advance the existing playback to its next phase.
          await frame();
        }
        await playback.finished;
        return {
          phases,
          events,
          cleared: svg.tokens.every((token) => token.style.offsetPath === ""),
        };
      },
      { map, reverse },
    );
    const from = reverse ? [250, 160] : [90, 110];
    const to = reverse ? [90, 110] : [250, 160];
    const expected = [
      [90, 85],
      [90, 85],
      [90 + (from[0] - 90) / 4, 85 + (from[1] - 85) / 4],
      [from[0] + (to[0] - from[0]) / 4, from[1] + (to[1] - from[1]) / 4],
      to,
    ];
    for (const [i, phase] of result.phases.entries()) {
      expect(phase.preserved).toBe(true);
      expect(phase.sameEvents).toBe(true);
      expect(phase.focused).toBe(true);
      for (const [token, point] of phase.changed.entries())
        for (const axis of [0, 1]) {
          expect(point[axis]).toBeCloseTo(expected[i][axis], 2);
          expect(phase.restored[token][axis]).toBeCloseTo(
            phase.before[token][axis],
            2,
          );
        }
    }
    expect(result.cleared).toBe(true);
    expect(result.events).toEqual([
      "start:0",
      "hop:0",
      "end:0",
      "start:1",
      "hop:1",
      "end:1",
      "done",
    ]);
  });

test("a mounted player's resize retargets its active travel without restarting playback", async ({
  page,
}) => {
  const map = ResolvedMapSchema.parse(
    JSON.parse(readFileSync("test/fixtures/map.json", "utf8")),
  );
  await page.goto("/integration/");
  const result = await page.evaluate(async (map) => {
    const { mount, WebAnimator } = await import("/assets/integration.js");
    document.body.replaceChildren();
    const host = document.createElement("div");
    host.style.width = "400px";
    document.body.append(host);
    const original = WebAnimator.prototype.retarget;
    let calls = 0;
    WebAnimator.prototype.retarget = function (map, scenario) {
      calls++;
      return original.call(this, map, scenario);
    };
    const player = mount(host, map, { reducedMotion: false });
    const frame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      await document.fonts.ready;
      await frame();
      await frame();
      player.dispatch({ type: "mode", mode: "all" });
      const tokens = [
        ...player.root.querySelectorAll<SVGCircleElement>(
          ".token, .token-glow",
        ),
      ];
      for (let phase = 0; phase < 3; phase++) {
        tokens.forEach((token) => token.getAnimations()[0].finish());
        await frame();
      }
      const animations = tokens.map((token) => token.getAnimations()[0]);
      animations.forEach((animation) => {
        animation.pause();
        animation.currentTime = 55;
      });
      await frame();
      const state = player.state;
      const url = location.href;
      const log = player.root.querySelector('[data-role="flowlog"]')!.innerHTML;
      const button = player.root.querySelector<HTMLButtonElement>(
        '[data-role="replay"]',
      )!;
      button.focus();
      let changes = 0;
      player.root.addEventListener("mapchange", () => {
        changes++;
      });
      const expectedStyle = document.createElement("div").style;
      expectedStyle.offsetPath = `path("${map.edges.ab.path}")`;
      const observations = [];
      for (const width of [180, 400]) {
        const before = calls;
        host.style.width = `${width}px`;
        await frame();
        await frame();
        observations.push({
          retargeted: calls > before,
          sameAnimation: animations.every(
            (animation, i) =>
              tokens[i].getAnimations()[0] === animation &&
              animation.currentTime === 55,
          ),
          sameState: JSON.stringify(player.state) === JSON.stringify(state),
          sameUrl: location.href === url,
          sameLog:
            player.root.querySelector('[data-role="flowlog"]')!.innerHTML ===
            log,
          sameFocus: document.activeElement === button,
          onPath: tokens.every(
            (token) => token.style.offsetPath === expectedStyle.offsetPath,
          ),
        });
      }
      player.destroy();
      return {
        observations,
        changes,
        stopped: tokens.every((token) => token.getAnimations().length === 0),
      };
    } finally {
      player.destroy();
      WebAnimator.prototype.retarget = original;
    }
  }, map);
  expect(result.observations).toHaveLength(2);
  for (const observation of result.observations)
    expect(Object.values(observation)).toEqual(Array(7).fill(true));
  expect(result.changes).toBe(0);
  expect(result.stopped).toBe(true);
});
