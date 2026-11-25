# Public schema migration

The Mini prototype changes four root exports: the two factories `mapSchema`
and `sourceMapSchema`, and the two concrete schemas `ResolvedMapSchema` and
`SourceMapSchema`. Parsing and inferred map data remain compatible in the
measured cases. Schema objects, their methods and their error classes do not.
This is a breaking package change even though the JSON format is unchanged.

## The book's actual usage

Audited `metronforge/metronforge-site-dev` at
`d7b0dab8c3cffc7555548d16757aa8892e011d1c`, retrieved on 2026-11-25.
The book still imports a local **format-2** kernel; it does not yet depend on
the published package. Its move to format 3 is separate work, so the counts
below describe Mini-specific edits to its existing consumption pattern, not
a complete book upgrade or a successful Astro build.

| Location in `illustrated-playwright/`                             | Observed use                                                         | Mini-specific change                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/components/map/authored-schema.ts`                           | One `mapSchema` call with three classic leaves; one `.superRefine()` | Replace the refinement call; retain all three leaves and `z.infer` |
| `src/content.config.ts`                                           | One `AuthoredMapSchema.transform()` for warnings                     | Replace with a classic outer pipe, preserving the callback         |
| `src/components/map/resolve-map.ts`                               | One `ResolvedMapSchema.parse()`                                      | No call-site change                                                |
| `scripts/generate-map-schema.mjs` and `tests/unit/schema.test.ts` | Two classic `z.toJSONSchema()` calls                                 | No converter change required for Mini schemas                      |

**Two affected method calls in two consumer files**, plus a Mini import in
the authored-schema file. The content configuration already imports classic
`z` from `astro/zod`. The three leaves are text, a source-reference object,
and a deeper-spread string. Their local `.optional()`, `.refine()` and other
classic methods need not be rewritten: the prototype accepts classic leaves.
The unrelated documentation collection can keep classic Zod too.

Across the book's `src`, `scripts` and `tests`, no consumer calls `.extend()`
on an imported map schema, and no `ZodError`, error `.flatten()` or error
`.format()` usage was found. The local kernel itself contains two `.extend()`
calls and its own generic `ZodType` constraints; replacing that kernel with
the package is not an additional consumer migration count. The book uses
`parse`, `safeParse` and `error.issues`, which remain available.

Pinned evidence: [authored adapter](https://github.com/metronforge/metronforge-site-dev/blob/d7b0dab8c3cffc7555548d16757aa8892e011d1c/illustrated-playwright/src/components/map/authored-schema.ts),
[content configuration](https://github.com/metronforge/metronforge-site-dev/blob/d7b0dab8c3cffc7555548d16757aa8892e011d1c/illustrated-playwright/src/content.config.ts),
[resolver](https://github.com/metronforge/metronforge-site-dev/blob/d7b0dab8c3cffc7555548d16757aa8892e011d1c/illustrated-playwright/src/components/map/resolve-map.ts),
[local kernel](https://github.com/metronforge/metronforge-site-dev/blob/d7b0dab8c3cffc7555548d16757aa8892e011d1c/illustrated-playwright/src/lib/concept-map/schema.ts).

## Before and after

Extract the existing refinement callback as `validateAuthored` and warning
callback as `warnAndReturn`; their bodies stay unchanged for the Mini API
conversion. Format-3 adaptations within those bodies are separate.

```ts
// Before: classic leaves and method-based composition.
import * as z from "zod";
const structural = mapSchema({
  text: z.string(),
  source: SourceRef,
  deeper: z.string(),
});
type AuthoredMap = z.infer<typeof structural>;
const AuthoredMapSchema = structural.superRefine(validateAuthored);
const collectionSchema = AuthoredMapSchema.transform(warnAndReturn);
```

```ts
// After: retain classic leaves and a classic outer schema for the host.
import * as z from "zod";
import * as mini from "zod/mini";
const structural = mapSchema({
  text: z.string(),
  source: SourceRef,
  deeper: z.string(),
});
type AuthoredMap = z.infer<typeof structural>;
const AuthoredMapSchema = structural.check(mini.superRefine(validateAuthored));
const collectionSchema = z.pipe(AuthoredMapSchema, z.transform(warnAndReturn));
```

The outer pipe is a classic `z.ZodType<AuthoredMap>` in the locked Zod 4.6.7
types, so method-based consumers can receive it. This checks Zod composition,
not every Astro integration requirement. A full book build must follow its
format-3 migration. Classic code is still loaded at build time; this example
does not claim the all-Mini bundle savings for a browser that also imports it.

Other consumers that extend the public schemas need these substitutions:

| Before                                                     | After (Mini schema, classic or Mini leaves)                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `SourceMapSchema.extend({ author: z.string() })`           | `mini.extend(SourceMapSchema, { author: z.string() })`                         |
| `SourceMapSchema.safeExtend({ title: z.string().min(1) })` | `mini.safeExtend(SourceMapSchema, { title: z.string().min(1) })`               |
| `schema.optional()`                                        | `mini.optional(schema)`                                                        |
| `schema.default(value)`                                    | `mini._default(schema, value)`                                                 |
| `schema.superRefine(callback)`                             | `schema.check(mini.superRefine(callback))`                                     |
| `schema.transform(callback)`                               | `mini.pipe(schema, mini.transform(callback))`, or the classic outer pipe above |
| A generic constraint `T extends z.ZodType`                 | `T extends z.core.$ZodType` when only the common core is required              |
| `schema instanceof z.ZodObject`                            | Audit the use; Mini objects are not classic objects                            |

Both concrete schemas carry layer refinements. With locked Zod 4.6.7, adding a
new field through `extend` succeeds and keeps checks; replacing an existing
field through plain `extend` throws in **both** variants. Use `safeExtend` for
compatible replacements. Do not reconstruct an object from `.shape` alone,
which omits the layer checks. The generic factories do not add those checks.
Broadening a generic constraint to the common core also means classic methods
cannot be assumed inside the generic function.

## Errors and introspection

English message parity does not preserve constructor identity:

| Probe on failed `safeParse`       | Classic   | Mini   |
| --------------------------------- | --------- | ------ |
| `error instanceof z.ZodError`     | true      | false  |
| `error instanceof core.$ZodError` | true      | true   |
| `error instanceof Error`          | true      | true   |
| `error.flatten` / `error.format`  | functions | absent |

For handlers shared across both, import `core` from `zod/v4/core` and check
`error instanceof core.$ZodError`, or use the discriminated `safeParse` result.
Use the top-level `z.flattenError(error)` or `z.treeifyError(error)` when needed;
tree output is not a promise of the old `.format()` output shape. These are
consumer changes even with English initialization enabled. The experiment's
existing unit-test adaptation also demonstrates missing literal `.value` and
array `.element` properties; direct schema introspection needs its own audit.

## Reproduce

Run from this repository after `npm run build`. The new capture script tests
both factories with classic leaves, custom refinement and transformation,
new-field extension, and safe replacement preserving unknown-layer rejection.
It records method and error identity separately for both concrete schemas.
It imports classic Zod deliberately, so it is not a locale-isolation test.

```sh
node scripts/zod-migration.mjs classic > /tmp/classic-migration.json
experiment=$(node scripts/zod-mini-experiment.mjs)
(cd "$experiment" && npm run build)
node scripts/zod-migration.mjs mini "$experiment" > /tmp/mini-migration.json
diff -u docs/evidence/zod-mini/migration/classic.json /tmp/classic-migration.json
diff -u docs/evidence/zod-mini/migration/mini.json /tmp/mini-migration.json
```

To repeat the consumer audit, download the pinned repository archive and search
its `illustrated-playwright/{src,scripts,tests}` for `mapSchema`,
`SourceMapSchema`, `ResolvedMapSchema`, `AuthoredMapSchema`, `ZodError`,
`instanceof`, `.extend(`, `.flatten(` and `.format(`. Follow schema definitions
into their callers; a text match alone does not distinguish library internals
from consumer calls. No book files were changed for this report.

The migration patterns were also type-checked against the temporary Mini build
with TypeScript 6.0.3 in strict NodeNext mode: classic leaf inference, refinement
callbacks, a classic outer pipe, and both extension forms compile. Negative
probes confirm a Mini schema cannot be assigned to classic `z.ZodType` and
has no `.extend()` method. The runtime capture above remains the checked-in
reproduction; no full book verification is claimed.

API references: [Mini composition](https://zod.dev/packages/mini),
[schema operations](https://zod.dev/api), and
[common core and errors](https://zod.dev/packages/core).
The observations here are pinned to installed Zod 4.6.7, not inferred solely
from documentation for another release.

## Remaining comparison

The migration burden is two observed book call sites, with additional risks
for consumers using classic object types, error classes or introspection.
The private-validator alternative still needs a bundle measurement and drift
assessment before the final recommendation. Public schemas remain classic;
this report does not select or implement an adoption option.
