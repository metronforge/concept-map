import type { ResolvedMap } from "../schema.js";
import type { Measurer } from "./ports.js";

/** Match the text floor of a drawing fitted into a width in label em.
 * The first engine pass supplies a size for reserving space in the second.
 * Final annotation refinement uses that second drawing's actual width;
 * do not iterate engines indefinitely when a graph cannot fit. */
export function atWidth(
  measurer: Measurer,
  map: ResolvedMap,
  widthEm?: number,
): Measurer {
  const minimum = widthEm === undefined ? 0 : map.viewBox[0] / widthEm;
  return {
    name: measurer.name,
    measure: (text, style) =>
      measurer.measure(text, {
        ...style,
        fontSize: Math.max(style.fontSize, minimum),
      }),
  };
}
