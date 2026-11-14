import type { ResolvedMap } from "../schema";
import type { Frame, LogLine } from "../model/frame";
import {
  renderPanelParts,
  defaultStrings,
  type UiStrings,
} from "../render/panel";
export class PanelDom {
  readonly head: HTMLElement;
  readonly more: HTMLElement;
  constructor(
    readonly root: HTMLElement,
    readonly strings: Partial<UiStrings> = {},
  ) {
    this.head = root.querySelector('[data-role="panel"]')!;
    this.more = root.querySelector('[data-role="more"]')!;
  }
  applyFrame(map: ResolvedMap, frame: Frame) {
    const focused = this.root.ownerDocument.activeElement;
    const owned = focused instanceof HTMLElement && this.root.contains(focused);
    const role = owned ? focused.dataset.role : undefined;
    const segment = owned ? focused.dataset.seg : undefined;
    const parts = renderPanelParts(map, frame, this.strings);
    this.head.innerHTML = parts.head;
    this.more.innerHTML = parts.more;
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
