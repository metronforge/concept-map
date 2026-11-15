import { z } from "zod";
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
  T extends z.ZodType,
  S extends z.ZodType,
  D extends z.ZodType,
>(leaf: Leaves<T, S, D>) {
  return z.object({
    id: Id,
    title: z.string(),
    text: leaf.text,
    show: ids(),
    current: ids(),
    edges: ids(),
    defs: ids(),
    code: Id.optional(),
    log: z.array(z.string()).optional(),
    fix: leaf.text.optional(),
    sources: z.array(leaf.source).default([]),
    deeper: z.array(leaf.deeper).default([]),
  });
}
export function scenarioSchema<
  T extends z.ZodType,
  S extends z.ZodType,
  D extends z.ZodType,
  B extends z.ZodType,
>(leaf: Leaves<T, S, D>, badge: B) {
  return z.object({
    id: Id,
    label: z.string(),
    display: Display.prefault({}),
    nodeLabels: record(z.string()).optional(),
    whole: z
      .object({ title: z.string().optional(), text: leaf.text.optional() })
      .optional(),
    steps: z.array(stepSchema(leaf)).min(1),
    flow: z.array(Hop).optional(),
    repeatBadges: z.array(badge).optional(),
  });
}
export function conceptSchema<
  T extends z.ZodType,
  S extends z.ZodType,
  D extends z.ZodType,
>(leaf: Leaves<T, S, D>) {
  return z.object({
    label: z.string(),
    layer: Layer,
    items: z.array(
      z.object({
        definition: Id,
        short: leaf.text,
        nodes: ids(),
        step: z.object({ scenario: Id.optional(), step: Id }),
        source: leaf.source.optional(),
      }),
    ),
  });
}
export function contentSchema<
  T extends z.ZodType,
  S extends z.ZodType,
  D extends z.ZodType,
>(leaf: Leaves<T, S, D>) {
  return {
    definitions: record(
      z.object({ term: z.string(), text: leaf.text }),
    ).default({}),
    code: record(
      z.object({
        title: z.string(),
        source: leaf.source.optional(),
        lines: z.array(z.string()),
      }),
    ).default({}),
    conceptScenario: Id.optional(),
    concepts: z.array(conceptSchema(leaf)).default([]),
    callouts: z.record(z.string(), ids()).default({}),
    deeper: z.array(leaf.deeper).default([]),
  };
}
