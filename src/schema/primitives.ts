import * as z from "zod/mini";
z.config(z.locales.en());
export const Id = z.string().check(z.regex(/^[A-Za-z][A-Za-z0-9_-]*$/));
export const Point = z.tuple([z.number(), z.number()]);
export const Box = z.tuple([
  z.number(),
  z.number(),
  z.number().check(z.gt(0)),
  z.number().check(z.gt(0)),
]);
export const Layer = Id;
export const ids = () => z._default(z.array(Id), []);
export const record = <T extends z.core.$ZodType>(value: T) =>
  z.record(Id, value);
export const Display = z.object({
  counterLabel: z._default(z.boolean(), true),
  edges: z._default(z.enum(["progressive", "all"]), "progressive"),
  edgeBadges: z._default(z.boolean(), true),
  nodeBadges: z._default(z.boolean(), false),
  log: z._default(z.enum(["incremental", "cumulative"]), "incremental"),
});
export const Lane = z.strictObject({ label: z.string(), layer: Layer });
export const Node = z.strictObject({
  label: z.string(),
  layer: Layer,
  lane: z.optional(Id),
  tag: z.optional(z.string()),
  mono: z.optional(z.boolean()),
  fail: z.optional(z.boolean()),
  custom: z.optional(z.boolean()),
});
export const Edge = z.strictObject({
  from: Id,
  to: Id,
  label: z.optional(z.string()),
  dashed: z.optional(z.boolean()),
});
export const Frame = z.strictObject({ label: z.string(), showWith: ids() });
export const RepeatBadge = z.strictObject({ edge: Id, step: Id });
export const Hop = z.object({
  node: Id,
  step: Id,
  log: z._default(z.array(z.string()), []),
  edge: z.optional(Id),
  reverse: z.optional(z.boolean()),
  fail: z.optional(z.boolean()),
});
export interface Leaves<
  T extends z.core.$ZodType,
  S extends z.core.$ZodType,
  D extends z.core.$ZodType,
> {
  text: T;
  source: S;
  deeper: D;
}
