import { expect, test } from "@playwright/test";

test("@player facade state events, version guard and destroy", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/2-actions/2-1-two-loops/");
  const moduleUrl = "/assets/player.js";
  const result = await page.evaluate(async (moduleUrl) => {
    const { MapPlayer } = await import(new URL(moduleUrl!, location.href).href);
    const original = document.querySelector<HTMLElement>(
      '[data-figure="map"]',
    )!;
    const root = original.cloneNode(true) as HTMLElement;
    root.id = "api-contract-map";
    original.after(root);
    const map = JSON.parse(root.querySelector("[data-map-data]")!.textContent!);
    let versionError = "";
    try {
      new MapPlayer(root, { ...map, format: 3 });
    } catch (error) {
      versionError = String(error);
    }
    const player = new MapPlayer(root, map, { reducedMotion: true });
    const changes: unknown[] = [];
    root.addEventListener("mapchange", (event) =>
      changes.push((event as CustomEvent).detail),
    );
    player.dispatch({ type: "next" });
    player.dispatch({ type: "mode", mode: "all" });
    player.dispatch({ type: "scenario", index: 1 });
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
    const hidden = player.state;
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    );
    const copy = player.state;
    copy.step = 999;
    const state = player.state;
    player.highlight(["call"], true);
    const highlighted = root
      .querySelector('[data-node="call"]')!
      .classList.contains("hl");
    player.highlight(["call"], false);
    (root as any).__player = player;
    player.destroy();
    return { versionError, hidden, state, changes, highlighted };
  }, moduleUrl);
  expect(result.versionError).toMatch(/format 3.*expected 2/);
  expect(result.hidden).toEqual({ scenario: 0, step: 0, mode: "all" });
  expect(result.state).toEqual({ scenario: 0, step: 0, mode: "step" });
  expect(result.changes).toEqual([
    { scenario: 0, step: 1, mode: "step" },
    { scenario: 0, step: 1, mode: "all" },
    { scenario: 1, step: 0, mode: "all" },
    { scenario: 0, step: 0, mode: "all" },
    { scenario: 0, step: 0, mode: "step" },
  ]);
  expect(result.highlighted).toBe(true);
  const root = page.locator("#api-contract-map");
  await root.locator('[data-role="next"]').click();
  await root.press("ArrowRight");
  await root.locator('[data-mode="all"]').click();
  const after = await root.evaluate((root) => ({
    state: (root as any).__player.state,
    // destroy cancels route playback; stylesheet transitions triggered by
    // earlier highlight/render operations are not owned by MapPlayer.
    animations: [...root.querySelectorAll(".token, .token-glow")].flatMap(
      (token) => token.getAnimations(),
    ).length,
  }));
  expect(after).toEqual({
    state: { scenario: 0, step: 0, mode: "step" },
    animations: 0,
  });
  expect(errors).toEqual([]);
});

test("@player injected arrival/done animator completes route and clears transient state", async ({
  page,
}) => {
  await page.goto("/2-actions/2-1-two-loops/");
  const moduleUrl = "/assets/player.js";
  const result = await page.evaluate(async (moduleUrl) => {
    const { MapPlayer } = await import(new URL(moduleUrl!, location.href).href);
    const original = document.querySelector<HTMLElement>(
        '[data-figure="map"]',
      )!,
      root = original.cloneNode(true) as HTMLElement;
    root.id = "injected-animator-map";
    original.after(root);
    const map = JSON.parse(root.querySelector("[data-map-data]")!.textContent!);
    const scenario = map.scenarios.findIndex((s: any) =>
      s.flow?.some((h: any) => h.fail),
    );
    const player = new MapPlayer(root, map, {
      reducedMotion: false,
      animator: {
        play(plan: any, hooks: any) {
          plan.hops.forEach((_h: any, i: number) => hooks.onHop(i));
          hooks.onDone();
          return { finished: Promise.resolve(), stop() {} };
        },
      },
    });
    player.dispatch({ type: "scenario", index: scenario });
    player.dispatch({ type: "mode", mode: "all" });
    const flow = map.scenarios[scenario].flow,
      failed = new Set<string>();
    for (const h of flow)
      if (h.fail) failed.add(h.node);
      else failed.delete(h.node);
    const actual = {
      trail: [...root.querySelectorAll("g.edge.trail")]
        .map((e) => e.getAttribute("data-edge"))
        .sort(),
      failed: [...root.querySelectorAll(".node.failnow")]
        .map((e) => e.getAttribute("data-node"))
        .sort(),
      transient: root.querySelectorAll(".node.oknow").length,
      lastStep: Number(
        root.querySelector("[data-li].now")?.getAttribute("data-li") ?? -1,
      ),
      token: root.querySelector(".token")!.getAttribute("visibility"),
    };
    const expected = {
      trail: [
        ...new Set(flow.flatMap((h: any) => (h.edge ? [h.edge] : []))),
      ].sort(),
      failed: [...failed].sort(),
      transient: 0,
      lastStep: map.scenarios[scenario].steps.findIndex(
        (s: any) => s.id === flow.at(-1).step,
      ),
      token: "hidden",
    };
    player.destroy();
    return { actual, expected };
  }, moduleUrl);
  expect(result.actual).toEqual(result.expected);
});

test("@player mapchange listeners can destroy or supersede dispatch without starting stale flows", async ({
  page,
}) => {
  await page.goto("/2-actions/2-1-two-loops/");
  const moduleUrl = "/assets/player.js";
  const result = await page.evaluate(async (moduleUrl) => {
    const { MapPlayer } = await import(new URL(moduleUrl!, location.href).href);
    const original = document.querySelector<HTMLElement>(
      '[data-figure="map"]',
    )!;
    const map = JSON.parse(
      original.querySelector("[data-map-data]")!.textContent!,
    );
    const destroyed = [];
    for (const reducedMotion of [false, true]) {
      const root = original.cloneNode(true) as HTMLElement;
      root.id = `destroy-listener-${reducedMotion}`;
      original.after(root);
      const player = new MapPlayer(root, map, { reducedMotion });
      let atDestroy = "";
      root.addEventListener(
        "mapchange",
        () => {
          player.destroy();
          atDestroy = root.innerHTML;
        },
        { once: true },
      );
      player.dispatch({ type: "mode", mode: "all" });
      destroyed.push({
        animations: [...root.querySelectorAll(".token, .token-glow")].flatMap(
          (token) => token.getAnimations(),
        ).length,
        unchanged: root.innerHTML === atDestroy,
      });
    }
    const root = original.cloneNode(true) as HTMLElement;
    root.id = "nested-listener";
    original.after(root);
    let starts = 0,
      stops = 0;
    const player = new MapPlayer(root, map, {
      reducedMotion: false,
      animator: {
        play() {
          starts++;
          return {
            finished: Promise.resolve(),
            stop() {
              stops++;
            },
          };
        },
      },
    });
    root.addEventListener(
      "mapchange",
      () => player.dispatch({ type: "scenario", index: 1 }),
      { once: true },
    );
    player.dispatch({ type: "mode", mode: "all" });
    const state = player.state;
    player.destroy();
    return { destroyed, starts, stops, state };
  }, moduleUrl);
  expect(result).toEqual({
    destroyed: [
      { animations: 0, unchanged: true },
      { animations: 0, unchanged: true },
    ],
    starts: 1,
    stops: 1,
    state: { scenario: 1, step: 0, mode: "all" },
  });
});
