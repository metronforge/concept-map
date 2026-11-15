import * as z from "zod";

export const Id = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
export const Point = z.tuple([z.number(), z.number()]);
export const Box = z.tuple([
  z.number(),
  z.number(),
  z.number().positive(),
  z.number().positive(),
]);
export const Layer = Id;
export const ids = () => z.array(Id).default([]);
export const record = <T extends z.ZodType>(value: T) => z.record(Id, value);
export const Display = z.object({
  counterLabel: z.boolean().default(true),
  edges: z.enum(["progressive", "all"]).default("progressive"),
  edgeBadges: z.boolean().default(true),
  nodeBadges: z.boolean().default(false),
  log: z.enum(["incremental", "cumulative"]).default("incremental"),
});
export const Lane = z.strictObject({ label: z.string(), layer: Layer });
export const Node = z.strictObject({
  label: z.string(),
  layer: Layer,
  lane: Id.optional(),
  tag: z.string().optional(),
  mono: z.boolean().optional(),
  fail: z.boolean().optional(),
  custom: z.boolean().optional(),
});
export const Edge = z.strictObject({
  from: Id,
  to: Id,
  label: z.string().optional(),
  dashed: z.boolean().optional(),
});
export const Frame = z.strictObject({ label: z.string(), showWith: ids() });
export const RepeatBadge = z.strictObject({ edge: Id, step: Id });
export const Hop = z.object({
  node: Id,
  step: Id,
  log: z.array(z.string()).default([]),
  edge: Id.optional(),
  reverse: z.boolean().optional(),
  fail: z.boolean().optional(),
});
export interface Leaves<
  T extends z.ZodType,
  S extends z.ZodType,
  D extends z.ZodType,
> {
  text: T;
  source: S;
  deeper: D;
}
