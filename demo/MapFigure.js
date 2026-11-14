import { MapPlayer, connectConcepts } from "../dist/index.js";
import "../css/concept-map.css";
export { MapPlayer, connectConcepts };
for (const root of document.querySelectorAll('[data-figure="map"]')) {
  const player = new MapPlayer(
    root,
    JSON.parse(root.querySelector("[data-map-data]").textContent),
  );
  for (const container of document.querySelectorAll("[data-map-concepts]"))
    connectConcepts(player, container);
}
