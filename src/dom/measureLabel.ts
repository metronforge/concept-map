import type { Measurer } from "../layout/ports.js";
import { paintPadding } from "./textBounds.js";
import type { LabelMeasurer } from "../layout/types.js";
export type {
  Measurer,
  LabelMeasurer,
  LabelSize,
  LabelStyle,
} from "../layout/measurement.js";
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

/** Measure the page's arrow-label style and existing wrapping. */
export function domMeasurer(host: HTMLElement): Measurer {
  const fallback = createDomMeasurer(host);
  return {
    name: "dom",
    measure(text, style) {
      const label = [...host.querySelectorAll<SVGTextElement>(".etext")].find(
        (el) =>
          style.edge ? el.dataset.edge === style.edge : el.textContent === text,
      );
      if (!text || !label || !style.mono || style.fontSize !== 10.5)
        return { ...fallback(text, style), uncertainty: style.fontSize / 64 };
      return measureArrow(host, label);
    },
  };
}

function measureArrow(host: HTMLElement, label: SVGTextElement) {
  const css = host.ownerDocument.defaultView!.getComputedStyle(label);
  const lines = [...label.querySelectorAll("tspan")].map(
    (line) => line.textContent ?? "",
  );
  const span = host.ownerDocument.createElement("span");
  Object.assign(span.style, {
    position: "absolute",
    visibility: "hidden",
    whiteSpace: "pre",
    lineHeight: "1.2",
  });
  copyFont(span.style, css);
  host.append(span);
  try {
    const sizes = (lines.length ? lines : [label.textContent ?? ""]).map(
      (text) => measureLine(span, text),
    );
    const lineHeight = parseFloat(css.fontSize);
    const size = {
      width: Math.max(...sizes.map((s) => s.width)),
      height: sizes[0].height + (sizes.length - 1) * lineHeight,
      ascent: sizes[0].ascent + ((sizes.length - 1) * lineHeight) / 2,
      uncertainty: lineHeight / 64,
      ...(lines.length ? { wrap: { lines, lineHeight } } : {}),
    };
    return { ...size, padding: paintPadding(label, size, lineHeight) };
  } finally {
    span.remove();
  }
}

function copyFont(target: CSSStyleDeclaration, source: CSSStyleDeclaration) {
  for (const key of [
    "fontFamily",
    "fontWeight",
    "fontSize",
    "fontStyle",
    "fontStretch",
    "fontVariantCaps",
    "fontKerning",
    "letterSpacing",
    "wordSpacing",
    "direction",
    "textRendering",
  ] as const)
    target[key] = source[key];
}

function measureLine(span: HTMLSpanElement, text: string) {
  span.textContent = text || " ";
  const marker = span.ownerDocument.createElement("span");
  Object.assign(marker.style, {
    display: "inline-block",
    width: "0",
    height: "0",
    verticalAlign: "baseline",
  });
  span.append(marker);
  const rect = span.getBoundingClientRect();
  return {
    width: text ? rect.width : 0,
    height: rect.height,
    ascent: marker.getBoundingClientRect().top - rect.top,
  };
}
