import * as z from "zod";
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
  T extends z.ZodType,
  S extends z.ZodType,
  D extends z.ZodType,
>(leaf: { text: T; source: S; deeper: D }) {
  return z.strictObject({
    format: z.literal(3),
    id: z.string().min(1),
    title: z.string(),
    direction: z.enum(["down", "right"]).optional(),
    layers: record(z.object({ label: z.string() })),
    lanes: record(Lane).default({}),
    frames: record(Frame).default({}),
    nodes: record(Node),
    edges: record(Edge).default({}),
    scenarios: z.array(scenarioSchema(leaf, RepeatBadge)).min(1),
    ...contentSchema(leaf),
  });
}
/** The adapter specializes leaves; resolved maps additionally require geometry. */
export function mapSchema<
  T extends z.ZodType,
  S extends z.ZodType,
  D extends z.ZodType,
>(leaf: { text: T; source: S; deeper: D }) {
  return sourceMapSchema(leaf).extend({
    viewBox: z.tuple([z.number().positive(), z.number().positive()]),
    lanes: record(
      Lane.extend({
        y: z.number(),
        h: z.number().positive(),
        x: z.number().optional(),
        w: z.number().positive().optional(),
      }),
    ).default({}),
    frames: record(Frame.extend({ box: Box })).default({}),
    nodes: record(Node.extend({ box: Box })),
    edges: record(
      Edge.extend({
        path: z.string(),
        badge: Point.optional(),
        label: z.object({ at: Point, text: z.string() }).optional(),
      }),
    ).default({}),
    scenarios: z
      .array(scenarioSchema(leaf, RepeatBadge.extend({ at: Point })))
      .min(1),
  });
}
export const ResolvedSource = z.object({ label: z.string(), url: z.url() });
export const ResolvedDeeper = z.object({ title: z.string(), href: z.string() });
const leaves = {
  text: z.string(),
  source: ResolvedSource,
  deeper: ResolvedDeeper,
};
const deeper = z.array(ResolvedDeeper.extend({ why: z.string() })).default([]);

/** Layer identifiers are CSS-safe keys declared by this map, never a fixed enum. */
function checkLayers(
  map: Pick<
    z.infer<ReturnType<typeof sourceMapSchema>>,
    "layers" | "nodes" | "lanes" | "concepts"
  >,
  ctx: z.RefinementCtx,
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
export const SourceMapSchema = sourceMapSchema(leaves)
  .extend({ deeper })
  .superRefine(checkLayers);
export const ResolvedMapSchema = mapSchema(leaves)
  .extend({ deeper })
  .superRefine(checkLayers);
export type SourceMap = z.infer<typeof SourceMapSchema>;
export type ResolvedMap = z.infer<typeof ResolvedMapSchema>;
