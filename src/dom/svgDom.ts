import type { Frame } from "../model/frame";
import type { reducedFlow } from "../model/flow";
import { renderBadges } from "../render/svg";
let markerSequence = 0;
export class SvgDom {
  readonly nodes: Record<string, SVGGElement>;
  readonly edges: Record<string, SVGGElement>;
  readonly lanes: Record<string, SVGGElement>;
  readonly frames: Record<string, SVGGElement>;
  readonly labels: Record<string, SVGTextElement>;
  readonly tokens: SVGCircleElement[];
  constructor(readonly svg: SVGSVGElement) {
    const markerId = `map-arrow-${++markerSequence}`;
    svg.querySelector("marker")!.id = markerId;
    svg
      .querySelectorAll("[marker-end]")
      .forEach((path) => path.setAttribute("marker-end", `url(#${markerId})`));
    const groups = (selector: string, key: string) =>
      Object.fromEntries(
        [...svg.querySelectorAll<SVGGElement>(selector)].map((e) => [
          e.getAttribute(key)!,
          e,
        ]),
      );
    this.nodes = groups(".node[data-node]", "data-node");
    this.edges = groups("g.edge[data-edge]", "data-edge");
    this.lanes = groups(".lane[data-lane]", "data-lane");
    this.frames = groups(".frame[data-frame]", "data-frame");
    this.labels = Object.fromEntries(
      [...svg.querySelectorAll<SVGTextElement>(".etext[data-edge]")].map(
        (e) => [e.dataset.edge!, e],
      ),
    );
    this.tokens = [
      ...svg.querySelectorAll<SVGCircleElement>(".token, .token-glow"),
    ];
  }
  applyFrame(frame: Frame) {
    for (const [id, n] of Object.entries(frame.nodes)) {
      this.nodes[id].classList.toggle("ghost", !n.revealed);
      this.nodes[id].classList.toggle("cur", n.current);
      this.nodes[id].querySelector("text")!.textContent = n.label;
    }
    for (const [id, e] of Object.entries(frame.edges)) {
      this.edges[id].classList.toggle("ghost", !e.revealed);
      this.edges[id].classList.toggle("cur", e.current);
    }
    for (const [id, l] of Object.entries(frame.lanes))
      this.lanes[id].classList.toggle("ghost", !l.revealed);
    for (const [id, f] of Object.entries(frame.frames))
      this.frames[id].classList.toggle("ghost", !f.revealed);
    for (const [id, l] of Object.entries(frame.edgeLabels))
      this.labels[id].classList.toggle("ghost", !l.revealed);
    this.svg.querySelector("[data-map-badges]")!.innerHTML = renderBadges(
      frame.badges,
    );
  }
  clearFlow() {
    Object.values(this.nodes).forEach((e) =>
      e.classList.remove("visit", "failnow", "oknow"),
    );
    Object.values(this.edges).forEach((e) => e.classList.remove("trail"));
    this.hideToken();
  }
  hideToken() {
    this.tokens.forEach((e) => e.setAttribute("visibility", "hidden"));
  }
  tokenFailure(on: boolean) {
    this.tokens.forEach((e) => e.classList.toggle("fail", on));
  }
  highlight(nodes: string[], on: boolean) {
    for (const id of nodes) this.nodes[id]?.classList.toggle("hl", on);
  }
  applyReduced(flow: ReturnType<typeof reducedFlow>) {
    flow.trail.forEach((id) => this.edges[id].classList.add("trail"));
    flow.visited.forEach((id) => this.nodes[id].classList.add("visit"));
    flow.failed.forEach((id) => this.nodes[id].classList.add("failnow"));
  }
}
