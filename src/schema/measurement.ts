import * as z from "zod/mini";
import { record } from "./primitives.js";
export const Measurement = z.optional(
  z.object({
    name: z.string().check(z.minLength(1)),
    labels: record(
      z.object({
        width: z.number().check(z.gte(0)),
        height: z.number().check(z.gt(0)),
        left: z.optional(z.number()),
        ascent: z.optional(z.number()),
        padding: z.optional(z.number().check(z.gte(0))),
        uncertainty: z.optional(z.number().check(z.gte(0))),
        wrap: z.optional(
          z.object({
            lines: z.array(z.string()).check(z.minLength(1)),
            lineHeight: z.number().check(z.gt(0)),
          }),
        ),
      }),
    ),
  }),
);
