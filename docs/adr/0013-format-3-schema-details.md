# ADR 0013: format 3 schema details and migration evidence

Status: proposed for task 0.2.0 item 2; author approves by merging this PR.

## Context

ADRs 0006 and 0011 select format 3, map-owned layers and plain inline text.
This item needs concrete defaults and a source/resolved boundary without
implementing layout or changing the 23 book maps' hand geometry.

## Decision

- `sourceMapSchema(leaf)` defines semantic fields; `mapSchema(leaf)` extends
  that structure with required geometry. `SourceMapSchema` and
  `ResolvedMapSchema` specialize text and links. Schema helpers stay inside
  the schema module; its dependency guard allows only Zod and other schema files.
- Source maps reject geometry rather than silently stripping it. Source edge
  labels are strings; resolved edge labels remain `{ text, at }`. Source repeat
  badges name an edge and step; their resolved form additionally requires `at`.
- `id` is a nonempty string, preserving existing identifiers such as `2.1`.
  Layer keys use the existing identifier grammar. Both concrete schemas check
  that nodes, lanes and concept groups use declared layers. Other semantic
  reference checking remains explicit debt D7; no unrelated stage-B fixes.
- Collections default to empty; scenario display retains its defaults. A node's
  lane is optional. A concept's source is optional; omitted `conceptScenario`
  selects the first scenario. Step id/title/text and the nonempty scenario/step
  lists remain required. No synthetic steps, inferred visibility or layout.
- The generic kernel's root `deeper` array directly uses the deeper leaf, with
  no book-specific wrapper. Both concrete schemas use `{ title, href, why }`
  at the root and `{ title, href }` in steps.
- JSON Schemas describe **input**, so fields with defaults are optional in
  editors and validators. Parsing with Zod materializes defaults. Layer lookup
  validation is a runtime refinement, not expressible in these JSON Schemas.
- Inline parsing happens only in renderers, including all rich-text leaves.
  `Frame.panel.text` replaces the former step-panel `html` field. Labels and
  code lines remain literal text. HTML-looking input is escaped, never parsed
  as markup. URL policy remains the host's responsibility.
- Nodes, lanes and concept dots all use `--cmap-layer-<id>` with the neutral
  `--cmap-layer` fallback. Remove old named colour properties and the `app` →
  `test` concept special case. Frame outlines use `--cmap-frame` and successful
  code lines use `--cmap-success` instead of book layer names; failure-state
  styling retains `--cmap-fail`. All existing neutral defaults stay unchanged.
  Hosts map their existing theme to the new inputs.

## Alternatives and evidence

Separate source/resolved copies would drift; allowing geometry in the source
schema would hide malformed input. Re-rendering new goldens would discard the
regression oracle. Instead, retain all 1050 hashes and normalize only the exact
new layer-colour references back to their old spelling during comparison.

Fixture migration changes only the format number, root identifier, declared
layers and rich-text representation. Existing inline HTML is decoded to plain
text/inline marks and round-trips through `renderInline`. Every other field,
including all geometry, is retained. See the PR and format-3 evidence.
