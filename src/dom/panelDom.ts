import type { ResolvedMap } from "../schema";
import type { Frame, LogLine } from "../model/frame";
import {
  renderPanelParts,
  statusText,
  defaultStrings,
  type UiStrings,
} from "../render/panel";
export class PanelDom {
  readonly head: HTMLElement;
  readonly more: HTMLElement;
  readonly status: HTMLElement | null;
  constructor(
    readonly root: HTMLElement,
    readonly strings: Partial<UiStrings> = {},
  ) {
    this.head = root.querySelector('[data-role="panel"]')!;
    this.more = root.querySelector('[data-role="more"]')!;
    this.status = root.querySelector("[data-map-status]");
  }
  applyFrame(map: ResolvedMap, frame: Frame) {
    const focused = this.root.ownerDocument.activeElement;
    const owned = focused instanceof HTMLElement && this.root.contains(focused);
    const role = owned ? focused.dataset.role : undefined;
    const segment = owned ? focused.dataset.seg : undefined;
    const parts = renderPanelParts(map, frame, this.strings);
    this.head.innerHTML = parts.head;
    this.more.innerHTML = parts.more;
    // The server renders the initial text, so the first frame changes nothing
    // and the page load stays silent.
    const status = statusText(frame);
    if (this.status && this.status.textContent !== status)
      this.status.textContent = status;
    if (focused instanceof HTMLElement && !focused.isConnected) {
      const replacement = role
        ? this.root.querySelector<HTMLElement>(`[data-role="${role}"]`)
        : segment
          ? this.root.querySelector<HTMLElement>(`[data-seg="${segment}"]`)
          : this.root;
      const target =
        replacement && !replacement.matches(":disabled")
          ? replacement
          : (this.root.querySelector<HTMLElement>('[aria-current="step"]') ??
            this.root);
      target.focus({ preventScroll: true });
    }
  }
  markStep(index: number) {
    this.more
      .querySelectorAll<HTMLElement>("[data-li]")
      .forEach((e) =>
        e.classList.toggle("now", Number(e.dataset.li) === index),
      );
  }
  setLog(lines: LogLine[]) {
    const log = this.root.querySelector<HTMLElement>('[data-role="flowlog"]');
    if (!log) return;
    const doc = this.root.ownerDocument,
      title = doc.createElement("h3");
    title.textContent = this.strings.callLog ?? defaultStrings.callLog;
    log.replaceChildren(
      title,
      ...lines.map((l) => {
        const div = doc.createElement("div");
        div.className = `line ${l.kind}`;
        div.textContent = l.text;
        return div;
      }),
    );
    log.scrollTop = log.scrollHeight;
  }
}
