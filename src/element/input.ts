import { layoutWithEngine } from "./layout.js";
import {
  ResolvedMapSchema,
  SourceMapSchema,
  type ResolvedMap,
  type SourceMap,
} from "../schema.js";

export type MapInput = ResolvedMap | SourceMap;
/** A host-supplied layout function takes priority over the layout attribute. */
export type MapLayout = (map: SourceMap) => Promise<ResolvedMap>;

export async function readInput(
  element: HTMLElement,
  assigned: MapInput | undefined,
  signal: AbortSignal,
  inline?: unknown,
): Promise<unknown> {
  if (assigned !== undefined) return assigned;
  const src = element.getAttribute("src");
  if (src !== null) {
    const response = await fetch(new URL(src, element.baseURI), { signal });
    if (!response.ok)
      throw new Error(`Unable to load concept map: HTTP ${response.status}`);
    return response.json();
  }
  const direct = element.querySelector(
    ':scope > script[type="application/json"]',
  );
  if (direct) return JSON.parse(direct.textContent ?? "");
  if (inline !== undefined) return inline;
  const data = element.querySelector(":scope > figure > script[data-map-data]");
  return data ? JSON.parse(data.textContent ?? "") : undefined;
}

export async function resolveInput(
  input: unknown,
  layout?: MapLayout,
  engine: string | null = null,
): Promise<ResolvedMap> {
  if (input && typeof input === "object" && "viewBox" in input)
    return ResolvedMapSchema.parse(input);
  const source = SourceMapSchema.parse(input);
  if (!layout && engine !== null) return layoutWithEngine(source, engine);
  if (!layout)
    throw new Error(
      "Source map needs layout: assign element.layout or provide a resolved map",
    );
  return ResolvedMapSchema.parse(await layout(source));
}
