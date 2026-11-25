import * as z from "zod/mini";
import { Box, Point } from "./primitives.js";
export const LayoutResultSchema = z.strictObject({
  nodes: z.record(z.string(), Box),
  lanes: z.record(z.string(), Box),
  edges: z.record(
    z.string(),
    z.strictObject({
      points: z.array(Point).check(z.minLength(2)),
      label: z.optional(Point),
    }),
  ),
});
