import { mount } from "../dom/mount.js";
import type { MapPlayer } from "../dom/player.js";
import {
  readInput,
  resolveInput,
  type MapInput,
  type MapLayout,
} from "./input.js";

/** A light-DOM player. Import the element entry point to register it. */
export class ConceptMapElement extends HTMLElement {
  static readonly observedAttributes = ["src"];
  private assigned?: MapInput;
  private resolver?: MapLayout;
  private active?: MapPlayer;
  private request?: AbortController;
  private readonly observer = new MutationObserver((records) => {
    if (
      records.some((record) => {
        const target =
          record.target instanceof Text
            ? record.target.parentElement
            : record.target;
        return (
          (target instanceof HTMLScriptElement &&
            target.parentElement === this) ||
          (target === this &&
            [...record.addedNodes, ...record.removedNodes].some(
              (node) => node instanceof HTMLScriptElement,
            ))
        );
      })
    )
      this.reload();
  });
  /** Settles after the latest input has loaded and mounted; rejects on invalid input. */
  ready: Promise<MapPlayer | undefined> = Promise.resolve(undefined);

  get map(): MapInput | undefined {
    return this.assigned;
  }
  set map(value: MapInput | undefined) {
    this.assigned = value;
    this.reload();
  }
  get layout(): MapLayout | undefined {
    return this.resolver;
  }
  set layout(value: MapLayout | undefined) {
    this.resolver = value;
    this.reload();
  }
  get player(): MapPlayer | undefined {
    return this.active;
  }

  connectedCallback() {
    for (const key of ["map", "layout"] as const) {
      if (!Object.prototype.hasOwnProperty.call(this, key)) continue;
      const value = this[key];
      delete (this as Partial<ConceptMapElement>)[key];
      if (key === "map") this.map = value as MapInput | undefined;
      else this.layout = value as MapLayout | undefined;
    }
    this.observe();
    this.reload();
  }
  disconnectedCallback() {
    this.observer.disconnect();
    this.request?.abort();
    this.active?.destroy();
    this.active = undefined;
    this.removeAttribute("aria-busy");
  }
  attributeChangedCallback() {
    this.reload();
  }

  private observe() {
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
  private reload() {
    if (!this.isConnected) return;
    this.request?.abort();
    const request = (this.request = new AbortController());
    this.active?.destroy();
    this.active = undefined;
    this.setAttribute("aria-busy", "true");
    this.ready = Promise.resolve().then(() => this.load(request.signal));
    // Consumers can await ready or listen to maperror, without unhandled rejections.
    void this.ready.catch(() => {});
  }
  private async load(signal: AbortSignal): Promise<MapPlayer | undefined> {
    try {
      if (signal.aborted) return;
      const input = await readInput(this, this.assigned, signal);
      if (input === undefined || signal.aborted) return;
      const map = await resolveInput(input, this.resolver);
      if (signal.aborted || !this.isConnected) return;
      this.observer.disconnect();
      this.active = mount(this, map);
      this.observe();
      this.dispatchEvent(
        new CustomEvent("mapready", { detail: this.active, bubbles: true }),
      );
      return this.active;
    } catch (error) {
      if (signal.aborted) return;
      this.dispatchEvent(
        new CustomEvent("maperror", { detail: error, bubbles: true }),
      );
      throw error;
    } finally {
      if (!signal.aborted) this.removeAttribute("aria-busy");
    }
  }
}
