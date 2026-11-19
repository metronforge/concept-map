import * as z from "zod";
import { Id } from "./primitives.js";

const strength = z.enum(["preferred", "required"]).default("preferred");
/** Optional author intent, retained as metadata when geometry is supplied. */
export const LayoutHints = z
  .strictObject({
    hints: z.array(
      z.union([
        z.strictObject({ kind: z.literal("free"), edge: Id, strength }),
        z.strictObject({
          kind: z.literal("sameRank"),
          nodes: z.array(Id).min(2),
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
  })
  .optional();
