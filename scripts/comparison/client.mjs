import { MapPlayer } from "../../dist/index.js";
const players = new Map();
for (const section of document.querySelectorAll("[data-map]")) {
  const mounted = [];
  const variants = [...section.querySelectorAll("[data-variant]")];
  const ready = Promise.all(
    variants.map(async (variant) => {
      const response = await fetch(
        `data/${section.dataset.map}-${variant.dataset.variant}.json`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { variant, map: await response.json() };
    }),
  ).then((entries) =>
    entries.map(({ variant, map }) => {
      const root = variant.querySelector("[data-player]");
      const player = new MapPlayer(root, map);
      root.dataset.ready = "true";
      players.set(root, player);
      mounted.push(player);
      const select = root.querySelector("[data-scenario-select]");
      select.addEventListener("change", () =>
        player.dispatch({ type: "scenario", index: Number(select.value) }),
      );
      root.addEventListener("mapchange", () => {
        select.value = String(player.state.scenario);
      });
      return player;
    }),
  );
  ready
    .then(() => {
      section.querySelector(".player-status").textContent =
        "Each column has its own player. Choose Whole map to play the flow.";
    })
    .catch((error) => {
      mounted.forEach((player) => {
        player.destroy();
        delete player.root.dataset.ready;
        players.delete(player.root);
      });
      section.querySelector(".player-status").textContent =
        `Could not load players: ${error.message}`;
    });
  for (const button of section.querySelectorAll("[data-all-columns]"))
    button.addEventListener("click", async () => {
      try {
        for (const player of await ready) {
          if (
            player.state.mode === "all" &&
            button.dataset.allColumns === "all"
          )
            player.replay();
          else
            player.dispatch({ type: "mode", mode: button.dataset.allColumns });
        }
      } catch {
        /* The loading error is already shown above. */
      }
    });
  for (const button of section.querySelectorAll("[data-zoom]"))
    button.addEventListener("click", () => {
      const native = button.closest(".variant").classList.toggle("native");
      button.setAttribute("aria-pressed", String(native));
      button.textContent = native ? "Fit" : "1:1";
    });
}
window.addEventListener("pagehide", () => {
  for (const player of players.values()) player.destroy();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});
