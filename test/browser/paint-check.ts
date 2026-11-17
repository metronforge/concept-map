import type { Page } from "@playwright/test";

/** Independently read drawn glyph ink, then use check() to reject any paint overlap.
 * No uncertainty is allowed here; SVG glyph-cell rectangles include unpainted space. */
export function paintContacts(page: Page) {
  return page.evaluate(async () => {
    const { check } = await import("/assets/integration.js");
    const player = document.querySelector("concept-map")!.player;
    return check(player.map, player.map, {
      margin: 0,
      tolerance: 0,
      measureLabel(_text, style) {
        const label = [...player.root.querySelectorAll(".etext")].find(
          (el) => el.dataset.edge === style.edge,
        )!;
        const css = getComputedStyle(label);
        const context = document.createElement("canvas").getContext("2d")!;
        for (const key of [
          "font",
          "fontKerning",
          "fontStretch",
          "fontVariantCaps",
          "letterSpacing",
          "wordSpacing",
          "direction",
          "textRendering",
        ])
          context[key] = css[key];
        const children = [...label.querySelectorAll("tspan")];
        const boxes = (children.length ? children : [label]).map((line) => {
          const ink = context.measureText(line.textContent!);
          const x =
            Number(line.getAttribute("x")) - Number(label.getAttribute("x"));
          const y =
            Number(line.getAttribute("y")) - Number(label.getAttribute("y"));
          return [
            x - ink.actualBoundingBoxLeft,
            y - ink.actualBoundingBoxAscent,
            x + ink.actualBoundingBoxRight,
            y + ink.actualBoundingBoxDescent,
          ];
        });
        const stroke =
          css.stroke === "none" ? 0 : parseFloat(css.strokeWidth) / 2;
        const left = Math.min(...boxes.map((b) => b[0])) - stroke;
        const top = Math.min(...boxes.map((b) => b[1])) - stroke;
        return {
          left,
          ascent: -top,
          width: Math.max(...boxes.map((b) => b[2])) + stroke - left,
          height: Math.max(...boxes.map((b) => b[3])) + stroke - top,
        };
      },
    }).steps.labels;
  });
}
