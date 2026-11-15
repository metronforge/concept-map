export interface MapInputs {
  assigned?: unknown;
  src?: string | null;
  direct?: string;
  inline?: unknown;
  server?: string;
}
export type SelectedMapInput =
  | { kind: "value"; value: unknown }
  | { kind: "url"; url: string }
  | { kind: "json"; text: string };

/** Choose before parsing, so invalid preferred data never falls back. */
export function selectMapInput(
  inputs: MapInputs,
): SelectedMapInput | undefined {
  if (inputs.assigned !== undefined)
    return { kind: "value", value: inputs.assigned };
  if (inputs.src !== undefined && inputs.src !== null)
    return { kind: "url", url: inputs.src };
  if (inputs.direct !== undefined) return { kind: "json", text: inputs.direct };
  if (inputs.inline !== undefined)
    return { kind: "value", value: inputs.inline };
  if (inputs.server !== undefined) return { kind: "json", text: inputs.server };
  return undefined;
}
