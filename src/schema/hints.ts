import * as z from "zod";
import { Id } from "./primitives.js";

/** Optional author intent, retained as metadata when geometry is supplied. */
export const LayoutHints = z
  .strictObject({
    hints: z.array(
      z.strictObject({
        kind: z.literal("sameRank"),
        nodes: z.array(Id).min(2),
        strength: z.enum(["preferred", "required"]).default("preferred"),
      }),
    ),
  })
  .optional();
