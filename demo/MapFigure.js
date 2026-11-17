import { MapPlayer, connectConcepts } from "../dist/dom/index.js";
import "../css/concept-map.css";
export { MapPlayer, connectConcepts };
export const players = [];
for (const root of document.querySelectorAll('[data-figure="map"]')) {
  const player = new MapPlayer(
    root,
    JSON.parse(root.querySelector("[data-map-data]").textContent),
  );
  players.push(player);
  for (const container of document.querySelectorAll("[data-map-concepts]"))
    connectConcepts(player, container);
}

export { createDomMeasurer } from "../dist/dom/measureLabel.js";
