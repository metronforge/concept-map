import { test, expect } from "@playwright/test";
import { candidateMaps } from "./candidate-maps";

test("the player requests and caches narrow geometry without restarting playback", async ({
  page,
}) => {
  await page.goto("/integration/");
  await page.addStyleTag({ path: "css/concept-map.css" });
  const result = await page.evaluate(async ({ wide, narrow }) => {
    const { mount, check, domMeasurer, WebAnimator } =
      await import("/assets/integration.js");
    document.body.replaceChildren();
    const host = document.createElement("div");
    host.style.width = "2000px";
    host.style.containerType = "inline-size";
    document.body.append(host);
    const requests: number[] = [];
    let resolve!: (map: typeof narrow) => void;
    const player = mount(host, wide, {
      reducedMotion: false,
      narrowLayout: (width: number) => {
        requests.push(width);
        return new Promise((done) => {
          resolve = done;
        });
      },
    });
    player.root.style.margin = "0";
    player.root.style.display = "block";
    const frame = () =>
      new Promise<void>((done) => requestAnimationFrame(() => done()));
    const settle = async () => {
      await frame();
      await frame();
      await frame();
    };
    await document.fonts.ready;
    await settle();
    const initialRequests = requests.length;
    // Give every phase enough time to inspect even on slower browser workers.
    const play = WebAnimator.prototype.play;
    WebAnimator.prototype.play = function (plan, hooks) {
      for (const segment of plan.segments) segment.duration = 10000;
      return play.call(this, plan, hooks);
    };
    try {
      player.dispatch({ type: "mode", mode: "all" });
    } finally {
      WebAnimator.prototype.play = play;
    }
    const tokens = [
      ...player.root.querySelectorAll<SVGCircleElement>(".token, .token-glow"),
    ];
    for (let phase = 0; phase < 3; phase++) {
      const previous = tokens.map((token) => token.getAnimations()[0]);
      previous.forEach((animation) => animation.finish());
      for (let attempt = 0; attempt < 10; attempt++) {
        await frame();
        if (
          tokens.every((token, i) => token.getAnimations()[0] !== previous[i])
        )
          break;
      }
    }
    const animations = tokens.map((token) => token.getAnimations()[0]);
    animations.forEach((animation) => {
      animation.pause();
      animation.currentTime = 1;
    });
    await frame();
    const before = {
      state: player.state,
      url: location.href,
      log: player.root.querySelector('[data-role="flowlog"]')!.innerHTML,
    };
    const button = player.root.querySelector<HTMLButtonElement>(
      '[data-role="replay"]',
    )!;
    button.focus();
    let changes = 0;
    player.root.addEventListener("mapchange", () => changes++);
    const sample = () => ({
      viewBox: player.map.viewBox,
      panel:
        player.root
          .querySelector("[data-map-edge-labels]")!
          .getAttribute("visibility") === "hidden",
      hard: check(wide, player.map, { measureLabel: domMeasurer(player.root) })
        .hard,
      preserved: animations.every(
        (animation, i) =>
          tokens[i].getAnimations()[0] === animation &&
          animation.currentTime === 1 &&
          animation.effect!.getTiming().duration === 10000,
      ),
      focused: document.activeElement === button,
      state: player.state,
      url: location.href,
      log: player.root.querySelector('[data-role="flowlog"]')!.innerHTML,
      tokenPath: tokens[0].style.offsetPath.replace(/\s+/g, ""),
    });
    host.style.width = "390px";
    await settle();
    const pending = sample();
    const label = player.root.querySelector<SVGTextElement>(".etext")!;
    const svg = player.root.querySelector("svg")!;
    const container = svg.parentElement!;
    const css = getComputedStyle(container);
    const expectedWidth =
      (container.clientWidth -
        parseFloat(css.paddingLeft) -
        parseFloat(css.paddingRight)) /
      ((parseFloat(getComputedStyle(label).fontSize) * svg.clientWidth) /
        wide.viewBox[0]);
    // A second fit while the promise is pending must share the request.
    document.fonts.dispatchEvent(new Event("loadingdone"));
    await settle();
    resolve(narrow);
    await settle();
    const selected = sample();
    host.style.width = "2000px";
    await settle();
    const restored = sample();
    host.style.width = "390px";
    await settle();
    const cached = sample();
    const reusedRequests = [...requests];
    host.style.width = "380px";
    await settle();
    const beforeDestroy = requests.length;
    player.destroy();
    const destroyedMarkup = host.innerHTML;
    resolve(narrow);
    await settle();
    return {
      before,
      initialRequests,
      pending,
      selected,
      restored,
      cached,
      reusedRequests,
      expectedWidth,
      changes,
      beforeDestroy,
      noLateMutation: host.innerHTML === destroyedMarkup,
      stopped: tokens.every((token) => !token.getAnimations().length),
    };
  }, candidateMaps());
  expect(result.initialRequests).toBe(0);
  expect(result.pending.panel).toBe(true);
  expect(result.pending.viewBox).toEqual([1200, 200]);
  expect(result.selected.viewBox).toEqual([300, 400]);
  expect(result.selected.panel).toBe(false);
  expect(result.selected.hard).toBe(0);
  expect(result.selected.tokenPath).toContain("V350");
  expect(result.restored.viewBox).toEqual([1200, 200]);
  expect(result.restored.panel).toBe(false);
  expect(result.restored.hard).toBe(0);
  expect(result.restored.tokenPath).toContain("V112");
  expect(result.cached).toEqual(result.selected);
  expect(result.reusedRequests).toHaveLength(1);
  expect(result.reusedRequests[0]).toBeCloseTo(result.expectedWidth, 8);
  expect(result.beforeDestroy).toBe(2);
  expect(result.noLateMutation).toBe(true);
  expect(result.stopped).toBe(true);
  expect(result.changes).toBe(0);
  for (const sample of [
    result.pending,
    result.selected,
    result.restored,
    result.cached,
  ]) {
    expect(sample.preserved).toBe(true);
    expect(sample.focused).toBe(true);
    expect({ state: sample.state, url: sample.url, log: sample.log }).toEqual(
      result.before,
    );
  }
});
