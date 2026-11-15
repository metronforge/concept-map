import { test, expect } from "@playwright/test";

const entry = "/assets/integration.js";
test("one map has the same DOM through server rendering, mount and the custom element", async ({
  page,
}) => {
  await page.goto("/integration/");
  const result = await page.evaluate(async (entry) => {
    const server = document.querySelector<HTMLElement>("#server")!;
    const custom = document.querySelector("#element")!;
    const serverSvg = server.querySelector("svg");
    const customSvg = custom.querySelector("svg");
    const map = JSON.parse(server.querySelector("script")!.textContent!);
    const { mount } = await import(entry);
    const element = custom as HTMLElement & {
      ready: Promise<unknown>;
      player: { dispatch(action: unknown): void };
    };
    await element.ready;
    const fresh = document.createElement("concept-map");
    fresh.style.width = "700px";
    fresh.map = map;
    document.body.append(fresh);
    await fresh.ready;
    const a = mount(server, map, { reducedMotion: true });
    const b = mount(document.querySelector<HTMLElement>("#browser")!, map, {
      reducedMotion: true,
    });
    const normalize = (root: Element) => {
      const clone = root
        .querySelector("figure")!
        .cloneNode(true) as HTMLElement;
      clone.querySelector("marker")!.id = "arrow";
      clone
        .querySelectorAll("[marker-end]")
        .forEach((e) => e.setAttribute("marker-end", "url(#arrow)"));
      return clone.outerHTML;
    };
    await document.fonts.ready;
    const equal = () =>
      [server, document.querySelector("#browser")!, custom, fresh].map(
        normalize,
      );
    const initial = equal();
    for (const player of [a, b, element.player, fresh.player!])
      player.dispatch({ type: "next" });
    const next = equal();
    for (const player of [a, b, element.player, fresh.player!])
      player.dispatch({ type: "scenario", index: 1 });
    const scenario = equal();
    return {
      initial,
      next,
      scenario,
      serverPreserved: serverSvg === server.querySelector("svg"),
      customPreserved: customSvg === custom.querySelector("svg"),
    };
  }, entry);
  expect(result.serverPreserved).toBe(true);
  expect(result.customPreserved).toBe(true);
  for (const variants of [result.initial, result.next, result.scenario]) {
    expect(variants[1]).toBe(variants[0]);
    expect(variants[2]).toBe(variants[0]);
    expect(variants[3]).toBe(variants[0]);
  }
  expect(result.next[0]).not.toBe(result.initial[0]);
  await page.locator("#element [data-mode=all]").click();
  await expect(page.locator("#element [data-role=replay]")).toBeVisible();
});

test("element inputs, updates, reconnection and errors keep one active player", async ({
  page,
}) => {
  await page.goto("/integration/");
  const result = await page.evaluate(async (entry) => {
    const map = JSON.parse(
      document.querySelector("#server script")!.textContent!,
    );
    const { ConceptMapElement, mount } = await import(entry);
    const el = new ConceptMapElement();
    el.setAttribute("src", "map.json");
    document.body.append(el);
    await el.ready;
    const loaded = el.player.map.id;
    const old = el.player;
    el.remove();
    old.dispatch({ type: "next" });
    const detached = old.state.step;
    document.body.append(el);
    await el.ready;
    el.querySelector('[data-role="next"]').click();
    const reconnected = el.player.state.step;
    const replacement = { ...map, title: "Replacement" };
    el.map = replacement;
    el.setAttribute("src", "missing.json");
    await el.ready;
    const propertyWins = el.player.map.title;
    const host = document.createElement("div");
    document.body.append(host);
    mount(host, map);
    const second = mount(host, map);
    host.querySelector('[data-role="next"]').click();
    const remounted = second.state.step;
    const inline = new ConceptMapElement();
    document.body.append(inline);
    const script = document.createElement("script");
    script.type = "application/json";
    script.textContent = JSON.stringify(map);
    inline.append(script);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await inline.ready;
    const inlineId = inline.player.map.id;
    let error = "";
    inline.addEventListener("maperror", (e: CustomEvent) => {
      error = String(e.detail);
    });
    inline.map = { ...map, format: 99 };
    await inline.ready.catch(() => {});
    return {
      loaded,
      detached,
      reconnected,
      propertyWins,
      remounted,
      inlineId,
      error,
      activeAfterError: !!inline.player,
    };
  }, entry);
  expect(result.loaded).toBe(result.inlineId);
  expect(result.detached).toBe(0);
  expect(result.reconnected).toBe(1);
  expect(result.remounted).toBe(1);
  expect(result.propertyWins).toBe("Replacement");
  expect(result.error).toContain("format");
  expect(result.activeAfterError).toBe(false);
});

test("a late response cannot replace a newer property map", async ({
  page,
}) => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/slow-map.json", async (route) => {
    await pending;
    await route.fulfill({ status: 500, body: "late response" }).catch(() => {});
  });
  await page.goto("/integration/");
  const result = await page.evaluate(async (entry) => {
    const map = JSON.parse(
      document.querySelector("#server script")!.textContent!,
    );
    const { ConceptMapElement } = await import(entry);
    const el = new ConceptMapElement();
    el.setAttribute("src", "slow-map.json");
    document.body.append(el);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const old = el.ready;
    el.map = { ...map, title: "Latest map" };
    await el.ready;
    await old;
    return el.player.map.title;
  }, entry);
  release();
  expect(result).toBe("Latest map");
});

test("property set before registration wins; source maps use only the supplied layout", async ({
  page,
}) => {
  await page.route("**/missing-map.json", (route) =>
    route.fulfill({ status: 404, body: "not found" }),
  );
  await page.goto("/integration/");
  const result = await page.evaluate(async (entry) => {
    const map = JSON.parse(
      document.querySelector("#server script")!.textContent!,
    );
    const early = document.querySelector("#element") as HTMLElement & {
      map: unknown;
      ready: Promise<unknown>;
      player: { map: { title: string } };
    };
    early.map = { ...map, title: "Assigned before import" };
    const { ConceptMapElement } = await import(entry);
    await early.ready;
    const source = {
      format: 3,
      id: map.id,
      title: map.title,
      layers: map.layers,
      nodes: { guest: { label: "Guest", layer: Object.keys(map.layers)[0] } },
      scenarios: [
        {
          id: "normal",
          label: "Normal",
          steps: [{ id: "order", title: "Order", text: "", show: ["guest"] }],
        },
      ],
    };
    const el = new ConceptMapElement();
    el.map = source;
    document.body.append(el);
    const missingLayout = await el.ready.then(
      () => "",
      (e: Error) => e.message,
    );
    let measured = false;
    el.layout = async (input: { nodes: Record<string, object> }) => {
      measured = !Object.values(input.nodes).some((n) => "box" in n);
      return map;
    };
    await el.ready;
    const title = el.player.map.title;
    el.map = undefined;
    el.setAttribute("src", "missing-map.json");
    const missingFile = await el.ready.then(
      () => "",
      (e: Error) => e.message,
    );
    return {
      early: early.player.map.title,
      missingLayout,
      measured,
      title,
      missingFile,
    };
  }, entry);
  expect(result.early).toBe("Assigned before import");
  expect(result.missingLayout).toContain("needs layout");
  expect(result.measured).toBe(true);
  expect(result.title).toContain("locator.click()");
  expect(result.missingFile).toContain("HTTP 404");
});

test("inline JSON can finish arriving after connection", async ({ page }) => {
  await page.goto("/integration/");
  const mounted = await page.evaluate(async (entry) => {
    const map = JSON.parse(
      document.querySelector("#server script")!.textContent!,
    );
    const { ConceptMapElement } = await import(entry);
    const el = new ConceptMapElement();
    const script = document.createElement("script");
    script.type = "application/json";
    script.textContent = "{";
    el.append(script);
    document.body.append(el);
    await el.ready.catch(() => {});
    script.firstChild!.textContent = JSON.stringify(map);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await el.ready.catch(() => {});
    return !!el.player;
  }, entry);
  expect(mounted).toBe(true);
});

test("direct JSON takes precedence over server data regardless of document order", async ({
  page,
}) => {
  await page.goto("/integration/");
  const title = await page.evaluate(async (entry) => {
    const map = JSON.parse(
      document.querySelector("#server script")!.textContent!,
    );
    const { ConceptMapElement } = await import(entry);
    const el = new ConceptMapElement();
    el.innerHTML = document.querySelector("#server")!.innerHTML;
    const script = document.createElement("script");
    script.type = "application/json";
    script.textContent = JSON.stringify({ ...map, title: "Direct JSON" });
    el.append(script);
    document.body.append(el);
    await el.ready;
    return el.player.map.title;
  }, entry);
  expect(title).toBe("Direct JSON");
});
