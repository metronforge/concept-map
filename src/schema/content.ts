import * as z from "zod/mini";
import {
  Id,
  Layer,
  Display,
  Hop,
  ids,
  record,
  type Leaves,
} from "./primitives.js";
function stepSchema<
  T extends z.core.$ZodType,
  S extends z.core.$ZodType,
  D extends z.core.$ZodType,
>(leaf: Leaves<T, S, D>) {
  return z.object({
    id: Id,
    title: z.string(),
    text: leaf.text,
    show: ids(),
    current: ids(),
    edges: ids(),
    defs: ids(),
    code: z.optional(Id),
    log: z.optional(z.array(z.string())),
    fix: z.optional(leaf.text),
    sources: z._default(z.array(leaf.source), []),
    deeper: z._default(z.array(leaf.deeper), []),
  });
}
export function scenarioSchema<
  T extends z.core.$ZodType,
  S extends z.core.$ZodType,
  D extends z.core.$ZodType,
  B extends z.core.$ZodType,
>(leaf: Leaves<T, S, D>, badge: B) {
  return z.object({
    id: Id,
    label: z.string(),
    display: z.prefault(Display, {}),
    nodeLabels: z.optional(record(z.string())),
    whole: z.optional(
      z.object({ title: z.optional(z.string()), text: z.optional(leaf.text) }),
    ),
    steps: z.array(stepSchema(leaf)).check(z.minLength(1)),
    flow: z.optional(z.array(Hop)),
    repeatBadges: z.optional(z.array(badge)),
  });
}
export function conceptSchema<
  T extends z.core.$ZodType,
  S extends z.core.$ZodType,
  D extends z.core.$ZodType,
>(leaf: Leaves<T, S, D>) {
  return z.object({
    label: z.string(),
    layer: Layer,
    items: z.array(
      z.object({
        definition: Id,
        short: leaf.text,
        nodes: ids(),
        step: z.object({ scenario: z.optional(Id), step: Id }),
        source: z.optional(leaf.source),
      }),
    ),
  });
}
export function contentSchema<
  T extends z.core.$ZodType,
  S extends z.core.$ZodType,
  D extends z.core.$ZodType,
>(leaf: Leaves<T, S, D>) {
  return {
    definitions: z._default(
      record(z.object({ term: z.string(), text: leaf.text })),
      {},
    ),
    code: z._default(
      record(
        z.object({
          title: z.string(),
          source: z.optional(leaf.source),
          lines: z.array(z.string()),
        }),
      ),
      {},
    ),
    conceptScenario: z.optional(Id),
    concepts: z._default(z.array(conceptSchema(leaf)), []),
    callouts: z._default(z.record(z.string(), ids()), {}),
    deeper: z._default(z.array(leaf.deeper), []),
  };
}
