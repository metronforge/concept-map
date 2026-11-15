import {
  ResolvedMapSchema,
  SourceMapSchema,
  type ResolvedMap,
  type SourceMap,
} from "../schema.js";

export type MapInput = ResolvedMap | SourceMap;
/** Supply layout explicitly; the element never downloads an engine. */
export type MapLayout = (map: SourceMap) => Promise<ResolvedMap>;

export async function readInput(
  element: HTMLElement,
  assigned: MapInput | undefined,
  signal: AbortSignal,
): Promise<unknown> {
  if (assigned !== undefined) return assigned;
  const src = element.getAttribute("src");
  if (src !== null) {
    const response = await fetch(new URL(src, element.baseURI), { signal });
    if (!response.ok)
      throw new Error(`Unable to load concept map: HTTP ${response.status}`);
    return response.json();
  }
  const data =
    element.querySelector(':scope > script[type="application/json"]') ??
    element.querySelector(":scope > figure > script[data-map-data]");
  return data ? JSON.parse(data.textContent ?? "") : undefined;
}

export async function resolveInput(
  input: unknown,
  layout?: MapLayout,
): Promise<ResolvedMap> {
  if (input && typeof input === "object" && "viewBox" in input)
    return ResolvedMapSchema.parse(input);
  const source = SourceMapSchema.parse(input);
  if (!layout)
    throw new Error(
      "Source map needs layout: assign element.layout or provide a resolved map",
    );
  return ResolvedMapSchema.parse(await layout(source));
}
