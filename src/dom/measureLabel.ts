import type { LabelMeasurer } from "../layout/types.js";
/** Call after host.ownerDocument.fonts.ready; uses the host's --cmap font inputs. */
export function createDomMeasurer(host: HTMLElement): LabelMeasurer {
  return (text, style) => {
    const span = host.ownerDocument.createElement("span");
    Object.assign(span.style, {
      position: "absolute",
      visibility: "hidden",
      pointerEvents: "none",
      whiteSpace: "pre",
      fontWeight: "500",
      lineHeight: "1.2",
      fontSize: `${style.fontSize}px`,
      letterSpacing: `${style.letterSpacing ?? 0}px`,
      fontFamily: style.mono
        ? "var(--cmap-font-mono, monospace)"
        : "var(--cmap-font-sans, system-ui)",
    });
    span.textContent = text || " ";
    host.append(span);
    try {
      const rect = span.getBoundingClientRect();
      return { width: text ? rect.width : 0, height: rect.height };
    } finally {
      span.remove();
    }
  };
}
