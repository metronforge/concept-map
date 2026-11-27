import * as z from "zod/mini";
import { Id, Point } from "./primitives.js";
const strength = z._default(z.enum(["preferred", "required"]), "preferred");
/** Optional author intent, retained as metadata when geometry is supplied. */
export const LayoutHints = z.optional(
  z.strictObject({
    hints: z.array(
      z.union([
        z.strictObject({ kind: z.literal("free"), edge: Id, strength }),
        z.strictObject({
          kind: z.literal("sameRank"),
          nodes: z.array(Id).check(z.minLength(2)),
          strength,
        }),
        z.strictObject({
          kind: z.literal("pin"),
          node: Id,
          at: Point,
          strength,
        }),
        z.strictObject({
          kind: z.literal("side"),
          edge: Id,
          end: z.enum(["from", "to"]),
          side: z.enum(["top", "right", "bottom", "left"]),
          strength,
        }),
      ]),
    ),
  }),
);
