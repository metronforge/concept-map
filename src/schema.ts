import { Measurement } from "./schema/measurement.js";
import { LayoutHints } from "./schema/hints.js";
import * as z from "zod/mini";
import {
  Id,
  Point,
  Box,
  Lane,
  Node,
  Edge,
  Frame,
  RepeatBadge,
  record,
} from "./schema/primitives.js";
import { contentSchema, scenarioSchema } from "./schema/content.js";
export { Id, Point, Box, Layer, Display } from "./schema/primitives.js";
/** Shared semantic structure; source maps deliberately reject geometry. */
export function sourceMapSchema<
  T extends z.core.$ZodType,
  S extends z.core.$ZodType,
  D extends z.core.$ZodType,
>(leaf: { text: T; source: S; deeper: D }) {
  return z.strictObject({
    format: z.literal(3),
    id: z.string().check(z.minLength(1)),
    title: z.string(),
    direction: z.optional(z.enum(["down", "right"])),
    layout: LayoutHints,
    layers: record(z.object({ label: z.string() })),
    lanes: z._default(record(Lane), {}),
    frames: z._default(record(Frame), {}),
    nodes: record(Node),
    edges: z._default(record(Edge), {}),
    scenarios: z.array(scenarioSchema(leaf, RepeatBadge)).check(z.minLength(1)),
    ...contentSchema(leaf),
  });
}
/** The adapter specializes leaves; resolved maps additionally require geometry. */
export function mapSchema<
  T extends z.core.$ZodType,
  S extends z.core.$ZodType,
  D extends z.core.$ZodType,
>(leaf: { text: T; source: S; deeper: D }) {
  return z.extend(sourceMapSchema(leaf), {
    viewBox: z.tuple([z.number().check(z.gt(0)), z.number().check(z.gt(0))]),
    measurement: Measurement,
    lanes: z._default(
      record(
        z.extend(Lane, {
          y: z.number(),
          h: z.number().check(z.gt(0)),
          x: z.optional(z.number()),
          w: z.optional(z.number().check(z.gt(0))),
        }),
      ),
      {},
    ),
    frames: z._default(record(z.extend(Frame, { box: Box })), {}),
    nodes: record(z.extend(Node, { box: Box })),
    edges: z._default(
      record(
        z.extend(Edge, {
          path: z.string(),
          badge: z.optional(Point),
          label: z.optional(z.object({ at: Point, text: z.string() })),
        }),
      ),
      {},
    ),
    scenarios: z
      .array(scenarioSchema(leaf, z.extend(RepeatBadge, { at: Point })))
      .check(z.minLength(1)),
  });
}
export const ResolvedSource = z.object({ label: z.string(), url: z.url() });
export const ResolvedDeeper = z.object({ title: z.string(), href: z.string() });
const leaves = {
  text: z.string(),
  source: ResolvedSource,
  deeper: ResolvedDeeper,
};
const deeper = z._default(
  z.array(z.extend(ResolvedDeeper, { why: z.string() })),
  [],
);
/** Layer identifiers are CSS-safe keys declared by this map, never a fixed enum. */
function checkLayers(
  map: Pick<
    z.infer<ReturnType<typeof sourceMapSchema>>,
    "layers" | "nodes" | "lanes" | "concepts"
  >,
  ctx: z.core.$RefinementCtx,
) {
  for (const field of ["nodes", "lanes", "concepts"] as const) {
    for (const [key, item] of Object.entries(map[field])) {
      if (!Object.hasOwn(map.layers, item.layer))
        ctx.addIssue({
          code: "custom",
          path: [field, field === "concepts" ? Number(key) : key, "layer"],
          message: `Unknown layer: ${item.layer}`,
        });
    }
  }
}
export const SourceMapSchema = z
  .extend(sourceMapSchema(leaves), { deeper })
  .check(z.superRefine(checkLayers));
export const ResolvedMapSchema = z
  .extend(mapSchema(leaves), { deeper })
  .check(z.superRefine(checkLayers));
export type SourceMap = z.infer<typeof SourceMapSchema>;
export type ResolvedMap = z.infer<typeof ResolvedMapSchema>;
