import * as z from "zod";
import { record } from "./primitives.js";
export const Measurement = z
  .object({
    name: z.string().min(1),
    labels: record(
      z.object({
        width: z.number().nonnegative(),
        height: z.number().positive(),
        left: z.number().optional(),
        ascent: z.number().optional(),
        padding: z.number().nonnegative().optional(),
        wrap: z
          .object({
            lines: z.array(z.string()).min(1),
            lineHeight: z.number().positive(),
          })
          .optional(),
      }),
    ),
  })
  .optional();
