import { layoutLevel } from "../schema/level.js";
import { selectMapInput } from "../model/input.js";
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
  const selected = selectMapInput({
    assigned,
    src: element.getAttribute("src"),
    direct: scriptText(element, ':scope > script[type="application/json"]'),
    inline,
    server: scriptText(element, ":scope > figure > script[data-map-data]"),
  });
  if (!selected) return undefined;
  if (selected.kind === "value") return selected.value;
  if (selected.kind === "json") return JSON.parse(selected.text);
  const response = await fetch(new URL(selected.url, element.baseURI), {
    signal,
  });
  if (!response.ok)
    throw new Error(`Unable to load concept map: HTTP ${response.status}`);
  return response.json();
}

export async function resolveInput(
  input: unknown,
  layout?: MapLayout,
  engine: string | null = null,
): Promise<{
  map: ResolvedMap;
  narrowLayout?: (widthEm: number) => Promise<ResolvedMap>;
}> {
  if (layoutLevel(input) === "resolved")
    return { map: ResolvedMapSchema.parse(input) };
  const source = SourceMapSchema.parse(input);
  if (!layout && engine !== null)
    return {
      map: await layoutWithEngine(source, engine),
      narrowLayout: (widthEm) => layoutWithEngine(source, engine, widthEm),
    };
  if (!layout)
    throw new Error(
      "Source map needs layout: assign element.layout or provide a resolved map",
    );
  return { map: ResolvedMapSchema.parse(await layout(source)) };
}

function scriptText(
  element: HTMLElement,
  selector: string,
): string | undefined {
  const script = element.querySelector(selector);
  return script ? (script.textContent ?? "") : undefined;
}
