import type { MapPlayer } from "./player.js";
import { bindings } from "./bindings.js";
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
        activateConcept(player, button);
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

function activateConcept(player: MapPlayer, button: HTMLElement) {
  const scenario = Math.max(
    0,
    player.map.scenarios.findIndex(
      (s) =>
        s.id === (button.dataset.conceptScenario ?? player.map.conceptScenario),
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
}
