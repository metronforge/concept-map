# ADR 0015: consumer bundle budgets and a Zod Mini decision

Status: accepted — budgets and packaging as below; Zod Mini: option 1, retain
classic Zod (author, 2026-11-15)

## Context and measurements

ADR 0009 measured the mixed entry with peer Zod external. That 9,936-byte result
is not the download cost of schema validation. Size Limit 14 automatically
externalizes every peer, even when the configuration has no `ignore` entry.
Override its Rolldown `external` setting to an empty list for all consumer cases.
An unused peer can then disappear through tree shaking, but is never omitted
merely because it is a peer.

Measured on base `2ce39e4`, Node 24, locked Zod 4.6.7, Size Limit 14/Rolldown,
minified gzip bytes (the tool subtracts its tiny wrapper overhead):

| Consumer imports                                                  | Before |  After | Limit (+10%, rounded up) |
| ----------------------------------------------------------------- | -----: | -----: | -----------------------: |
| MapPlayer, connectConcepts                                        | 34,332 |  7,711 |                    8,483 |
| renderSvg, renderPanelParts, renderConcepts, derive, initialState | 30,580 |  3,807 |                    4,188 |
| SourceMapSchema, ResolvedMapSchema                                | 26,943 | 26,943 |                   29,638 |
| layout, measureLabel (host supplies engine)                       | 29,654 | 29,654 |                   32,620 |
| complete root API                                                 | 35,599 | 35,599 |                   39,159 |

The first two scenarios consume already resolved maps and need no validation.
The latter three include the real Zod dependency. Engines are not imported by
these consumers; their comparison belongs to task item 4. CSS is an independent
host import, not included in JavaScript sizes.

## Packaging correction

Mark JavaScript modules side-effect-free while retaining `./css/*.css` in
`sideEffects`. Import Zod as `import * as z from "zod"` in schema modules. No
public entry point, schema behavior or engine selection changes. With the locked
Zod version, the namespace spelling produces no additional measured reduction;
the demonstrated savings come from dropping unused schema initialization when
only playback or rendering is imported. Keep both explicit choices in source.

The five executable limits in `.size-limit.js` replace the peer-external mixed
entry budget. Dependency bundling is intentional for measurement only: published
files remain unbundled ESM and Zod remains a shared peer (ADR 0007).

## Proposed Zod Mini decision — stop for the author

Recommendation: retain classic Zod for the public shared kernel for now. Do not
silently switch existing schema exports to Mini. Reconsider a separately reviewed
migration only if the remaining validation cost is unacceptable.

Alternatives:

1. **Retain classic Zod** (recommended): keep the existing method-based public
   schemas, generic `z.ZodType` leaves and the book's schema-extension workflow.
   Validation consumers pay the measured cost above; playback-only consumers do
   not. No migration is required.
2. **Migrate the public kernel to Mini**: potentially reduce validation bundles,
   but change the exposed types and schema-building API. Audit consumers using
   `.extend()`, `.default()`, `.optional()`, refinements and `instanceof`; update
   API reports, JSON Schema parity, defaults, unknown-key behavior and errors.
   Treat this as a separate breaking proposal with a migration guide and measured
   project-specific savings before adoption.
3. **Keep classic public schemas and add a private Mini validator**: avoids a
   direct public schema change but risks duplicate validators, drift and shipping
   both implementations. Not recommended without evidence of a net reduction.

[Zod's official Mini documentation](https://zod.dev/packages/mini) describes its
functional API and `ZodMiniType` rather than classic `ZodType`. Its example size
reductions are not measurements of this project's schemas. This PR neither
migrates to Mini nor claims a Mini size result. The author must choose before any
such implementation starts.

## Decision

The author accepts the packaging correction and the five budgets, and option 1:
classic Zod stays the public schema kernel. Revisit only with a measurement
showing the custom element (task item 5) is too heavy because of validation.
