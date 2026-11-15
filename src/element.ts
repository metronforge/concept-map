export { ConceptMapElement } from "./element/element.js";
export type { MapInput, MapLayout } from "./element/input.js";
import { ConceptMapElement } from "./element/element.js";
if (!customElements.get("concept-map"))
  customElements.define("concept-map", ConceptMapElement);

declare global {
  interface HTMLElementTagNameMap {
    "concept-map": ConceptMapElement;
  }
}
