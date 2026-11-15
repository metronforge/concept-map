import pages from "../../fixtures/pages.json" with { type: "json" };
import type { Page } from "@playwright/test";
import type { ResolvedMap } from "../../../src/schema";
import type { PlayerState } from "../../../src/model/state";
import { renderInline } from "../../../src/render/inline";
import { derive } from "../../../src/model/frame";
export const plain = (html: string) =>
  html
    .replace(/<\/?(?:code|em|strong)>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
export const mapPages = pages.map((p) => ({
  mapId: p.id,
  figureId: p.figureId,
  path: p.path,
}));
export function expectedSnapshot(map: ResolvedMap, state: PlayerState) {
  const f = derive(map, state),
    p = f.panel;
  const panel =
    p.kind === "all"
      ? {
          count: p.count,
          title: p.title,
          text: plain(renderInline(p.text)).trim(),
          log: [],
          defs: [],
          sources: [],
          deeper: [],
          steps: p.steps,
        }
      : {
          count: p.count,
          title: p.title,
          text: plain(renderInline(p.text)).trim(),
          log: p.log,
          ...(p.fix ? { fix: "Fix: " + plain(renderInline(p.fix)) } : {}),
          ...(p.code
            ? {
                code: {
                  title: p.code.title,
                  ...(p.code.source ? { source: p.code.source.url } : {}),
                  text: p.code.lines.join("\n"),
                },
              }
            : {}),
          defs: p.defs.map((d) => ({
            term: d.term,
            text: plain(renderInline(d.text)),
          })),
          sources: p.sources.map((s) => s.url),
          deeper: p.deeper.map((d) => d.href),
          canBack: p.canBack,
          canNext: p.canNext,
          ...(p.nextScenario ? { nextScenario: p.nextScenario } : {}),
        };
  return {
    scenario: map.scenarios[state.scenario].id,
    mode: state.mode,
    nodes: Object.fromEntries(
      Object.entries(f.nodes).map(([id, n]) => [
        id,
        { ghost: !n.revealed, cur: n.current, label: n.label },
      ]),
    ),
    edges: Object.fromEntries(
      Object.entries(f.edges).map(([id, e]) => [
        id,
        { ghost: !e.revealed, cur: e.current },
      ]),
    ),
    lanes: Object.fromEntries(
      Object.entries(f.lanes).map(([id, l]) => [id, { ghost: !l.revealed }]),
    ),
    frames: Object.fromEntries(
      Object.entries(f.frames).map(([id, l]) => [id, { ghost: !l.revealed }]),
    ),
    edgeLabels: Object.fromEntries(
      Object.entries(f.edgeLabels).map(([id, l]) => [
        id,
        { ghost: !l.revealed, text: map.edges[id].label!.text },
      ]),
    ),
    badges: f.badges
      .map((b) => ({ x: b.x, y: b.y, text: String(b.n), cur: b.current }))
      .sort(
        (a, b) =>
          a.x - b.x ||
          a.y - b.y ||
          a.text.localeCompare(b.text) ||
          Number(a.cur) - Number(b.cur),
      ),
    panel,
  };
}
/** Serializable: runs in the page, using only the public DOM contract. */
export function domSnapshot(root: Element) {
  const all = (selector: string) => [...root.querySelectorAll(selector)];
  const text = (selector: string) =>
    root.querySelector(selector)?.textContent?.trim() ?? "";
  const record = (
    selector: string,
    key: string,
    read: (e: Element) => unknown,
  ) =>
    Object.fromEntries(
      all(selector).map((e) => [e.getAttribute(key)!, read(e)]),
    );
  const mode = root
    .querySelector('[data-mode][aria-pressed="true"]')!
    .getAttribute("data-mode");
  const panel: Record<string, unknown> = {
    count: text(".count"),
    title: text(".head h2"),
    text: text(".head > p"),
    log: all(".more > .log > div").map((e) => ({
      text: e.textContent,
      kind: e.classList.contains("old")
        ? "old"
        : e.classList.contains("err")
          ? "err"
          : "new",
    })),
    defs: all(".defs dl > div").map((e) => ({
      term: e.querySelector("dt")!.textContent,
      text: e.querySelector("dd")!.textContent,
    })),
    sources: all(".refs .src a").map((e) => e.getAttribute("href")),
    deeper: all(".refs > div:not(.src) a").map((e) => e.getAttribute("href")),
  };
  if (mode === "all")
    panel.steps = all(".all [data-go] span:last-child").map(
      (e) => e.textContent,
    );
  else {
    panel.canBack =
      !root.querySelector<HTMLButtonElement>('[data-role="back"]')!.disabled;
    panel.canNext =
      !root.querySelector<HTMLButtonElement>('[data-role="next"]')!.disabled;
    const next = text('[data-role="nextscenario"]');
    if (next) panel.nextScenario = next;
    if (root.querySelector(".fix")) panel.fix = text(".fix");
    if (root.querySelector(".code"))
      panel.code = {
        title: text(".code .ttl span"),
        ...(root.querySelector(".code .ttl a")
          ? { source: root.querySelector(".code .ttl a")!.getAttribute("href") }
          : {}),
        text: root.querySelector(".code pre")!.textContent,
      };
  }
  return {
    scenario: root
      .querySelector('[data-scenario][aria-pressed="true"]')!
      .getAttribute("data-scenario"),
    mode,
    nodes: record(".node[data-node]", "data-node", (e) => ({
      ghost: e.classList.contains("ghost"),
      cur: e.classList.contains("cur"),
      label: e.querySelector("text:not(.tag)")!.textContent,
    })),
    edges: record("g.edge[data-edge]", "data-edge", (e) => ({
      ghost: e.classList.contains("ghost"),
      cur: e.classList.contains("cur"),
    })),
    lanes: record(".lane[data-lane]", "data-lane", (e) => ({
      ghost: e.classList.contains("ghost"),
    })),
    frames: record(".frame[data-frame]", "data-frame", (e) => ({
      ghost: e.classList.contains("ghost"),
    })),
    edgeLabels: record(".etext[data-edge]", "data-edge", (e) => ({
      ghost: e.classList.contains("ghost"),
      text: e.textContent,
    })),
    badges: all(".badge")
      .map((e) => {
        const circle = e.querySelector("circle")!;
        return {
          x: Number(circle.getAttribute("cx")),
          y: Number(circle.getAttribute("cy")),
          text: e.querySelector("text")!.textContent!,
          cur: e.classList.contains("cur"),
        };
      })
      .sort(
        (a, b) =>
          a.x - b.x ||
          a.y - b.y ||
          a.text.localeCompare(b.text) ||
          Number(a.cur) - Number(b.cur),
      ),
    panel,
  };
}
export async function finishAnimations(page: Page, milliseconds?: number) {
  await page
    .locator('[data-figure="map"]')
    .first()
    .evaluate(async (root, milliseconds) => {
      let remaining = milliseconds ?? Infinity;
      for (let phase = 0; phase < 2000; phase++) {
        for (let i = 0; i < 4; i++) await Promise.resolve();
        const active = document.getAnimations().filter((a) => {
          const target = (a.effect as KeyframeEffect | null)?.target;
          return (
            target instanceof Element &&
            root.contains(target) &&
            target.matches(".token,.token-glow")
          );
        });
        if (!active.length) return;
        active.forEach((a) => a.pause());
        const elapsed = Number(active[0].currentTime ?? 0),
          left = Math.max(
            0,
            Number(active[0].effect!.getTiming().duration) - elapsed,
          );
        if (remaining < left) {
          active.forEach((a) => (a.currentTime = elapsed + remaining));
          return;
        }
        active.forEach((a) => a.finish());
        remaining -= left;
      }
      throw new Error("Flow did not complete in 2000 animation phases");
    }, milliseconds);
}
