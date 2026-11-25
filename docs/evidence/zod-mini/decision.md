# Validation choices before 0.3.0

The measurements use locked Zod 4.6.7, Node 24.12.0 and the same bundled,
minified gzip consumers. They are an experiment for the author, not an adopted
change. See [the Mini experiment](mini.md) and [migration audit](migration.md)
for methods and limitations.

| Choice                       |                                                                          Component |                                 Schema validation | Compatibility and cost                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------: | ------------------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------- |
| Keep classic                 |                                                                           48,182 B |                                          27,165 B | Existing public API and English errors; no migration.                                                                             |
| Public Mini with English     |                                                          32,108 B (16,074 B saved) |                         11,053 B (16,112 B saved) | Both JSON Schemas and captured outputs match; public schema methods and error identity change.                                    |
| Classic public, private Mini | About 32,108 B for a component using only Mini; estimate, not a hybrid measurement | 27,165 B for classic public schemas, if unchanged | Public extensions stay classic, but two validators must agree. A consumer using both may download both; its size is not measured. |

The Mini column uses complete measured bundles, not a subtraction of separate
bundles. The private estimate assumes the element's entire static validation path
uses the same Mini schemas and no classic runtime schema remains reachable. The
Mini-only component measurement establishes the size under that assumption; it
does **not** establish that a hybrid implementation achieves it. The element
also validates source maps and layout results; lazy layout paths need the same
analysis, and mixing imports can pull classic Zod back in. The other six measured
consumers and savings are in the [size table](mini.md#mini-rewrite-size-and-validation-experiment).

A private copy doubles the rules that govern strict keys, defaults, refinements,
layer lookup and source versus resolved geometry. A format change could then
accept a map through the public schema but reject it in the element, or produce
different defaults or errors. Reference checks are a separate boundary and must
also remain consistent. Generated JSON Schema parity alone cannot prove runtime
refinements or defaulted output parity. A viable hybrid needs a single generated
source of rules or maintained differential tests covering valid and invalid maps,
outputs, errors and references, plus measurements of mixed and lazy consumers.
Those safeguards cost maintenance and do not by themselves eliminate drift.

Without English initialization, Mini's standard errors become `Invalid input`;
`z.config(z.locales.en())` restores all ten captured errors at a component cost
of 1,109 B compared with the no-locale prototype. The two generated JSON Schemas
match byte for byte. The book audit finds two affected method calls in two files,
although its separate format-3 migration remains; other consumers may use more of
the classic API. Mini errors also lack classic error identity and convenience
methods. The audit includes before and after examples.

**Recommendation:** retain classic public schemas for 0.3.0 unless the component
saving justifies a breaking migration. If it does, prefer a separately reviewed
public Mini migration with English messages and a migration guide over maintaining
two independent validators. The author decides whether the saving warrants that
break; this experiment does not switch the package or claim the hybrid is built.
