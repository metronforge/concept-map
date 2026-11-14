import { z } from "zod";

export const Id = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
export const Point = z.tuple([z.number(), z.number()]);
export const Box = z.tuple([
  z.number(),
  z.number(),
  z.number().positive(),
  z.number().positive(),
]);
export const Layer = z.enum([
  "runner",
  "client",
  "server",
  "page",
  "browser",
  "app",
  "fail",
  "test",
  "protocol",
]);
const ids = () => z.array(Id);
const record = <T extends z.ZodType>(value: T) => z.record(Id, value);
export const Display = z.object({
  counterLabel: z.boolean().default(true),
  edges: z.enum(["progressive", "all"]).default("progressive"),
  edgeBadges: z.boolean().default(true),
  nodeBadges: z.boolean().default(false),
  log: z.enum(["incremental", "cumulative"]).default("incremental"),
});

/** The adapter specializes only leaves; runtime modules use inferred types only. */
export function mapSchema<
  T extends z.ZodType,
  S extends z.ZodType,
  D extends z.ZodType,
>(leaf: { text: T; source: S; deeper: D }) {
  return z.object({
    format: z.literal(2),
    spread: z.string(),
    title: z.string(),
    viewBox: z.tuple([z.number().positive(), z.number().positive()]),
    lanes: record(
      z.object({
        label: z.string(),
        layer: Layer,
        y: z.number(),
        h: z.number().positive(),
        x: z.number().optional(),
        w: z.number().positive().optional(),
      }),
    ),
    frames: record(z.object({ label: z.string(), box: Box, showWith: ids() })),
    nodes: record(
      z.object({
        label: z.string(),
        layer: Layer,
        lane: Id,
        box: Box,
        tag: z.string().optional(),
        mono: z.boolean().optional(),
        fail: z.boolean().optional(),
        custom: z.boolean().optional(),
      }),
    ),
    edges: record(
      z.object({
        from: Id,
        to: Id,
        path: z.string(),
        dashed: z.boolean().optional(),
        badge: Point.optional(),
        label: z.object({ at: Point, text: z.string() }).optional(),
      }),
    ),
    definitions: record(z.object({ term: z.string(), text: leaf.text })),
    code: record(
      z.object({
        title: z.string(),
        source: leaf.source.optional(),
        lines: z.array(z.string()),
      }),
    ),
    scenarios: z
      .array(
        z.object({
          id: Id,
          label: z.string(),
          display: Display.prefault({}),
          nodeLabels: record(z.string()).optional(),
          whole: z
            .object({
              title: z.string().optional(),
              text: leaf.text.optional(),
            })
            .optional(),
          steps: z
            .array(
              z.object({
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
                sources: z.array(leaf.source),
                deeper: z.array(leaf.deeper),
              }),
            )
            .min(1),
          flow: z
            .array(
              z.object({
                node: Id,
                step: Id,
                log: z.array(z.string()),
                edge: Id.optional(),
                reverse: z.boolean().optional(),
                fail: z.boolean().optional(),
              }),
            )
            .optional(),
          repeatBadges: z
            .array(z.object({ edge: Id, step: Id, at: Point }))
            .optional(),
        }),
      )
      .min(1),
    conceptScenario: Id,
    concepts: z.array(
      z.object({
        label: z.string(),
        layer: Layer,
        items: z.array(
          z.object({
            definition: Id,
            short: leaf.text,
            nodes: ids(),
            step: z.object({ scenario: Id.optional(), step: Id }),
            source: leaf.source,
          }),
        ),
      }),
    ),
    callouts: z.record(z.string(), ids()),
    deeper: z.array(z.object({ spread: leaf.deeper, why: leaf.text })),
  });
}
export const ResolvedSource = z.object({ label: z.string(), url: z.url() });
export const ResolvedDeeper = z.object({ title: z.string(), href: z.string() });
export const ResolvedMapSchema = mapSchema({
  text: z.string(),
  source: ResolvedSource,
  deeper: ResolvedDeeper,
}).extend({
  deeper: z.array(ResolvedDeeper.extend({ why: z.string() })),
});
export type ResolvedMap = z.infer<typeof ResolvedMapSchema>;
