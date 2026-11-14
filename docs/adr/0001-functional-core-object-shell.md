# ADR 0001: functional core, object shell

Status: accepted (approved by the author by merging the pull request that set this status)

## Context

The author wants a library with a deliberate structure: an object-oriented
API that follows GRASP and SOLID, and domain language (DDD). The data of the
library is a resolved map: JSON rendered on a server, embedded in the page
and read in the browser.

## Options

1. Everything as classes (`ConceptMap`, `Scenario`, `Step` entities with
   methods).
2. Everything as functions, including the browser part.
3. Pure functions over immutable data in the core; classes for the facade,
   ports and adapters.

## Decision

Option 3.

- Classes with methods do not survive serialisation: option 1 needs a
  hydration step on both sides and two shapes of the same data.
- Properties and model-based tests are simplest over pure functions.
- The browser part has lifecycle, injected collaborators and substitutable
  implementations: that is what classes and interfaces are for. Option 2
  would rebuild them with closures.

From DDD we take the language, the two contexts with an anti-corruption
layer, value objects (as branded types) and one aggregate (player state
behind `reduce`). We do not take repositories, factories, domain events or
services: there is nothing for them to do.

## Consequences

- Lint forbids classes in `schema`, `model`, `render`.
- The facade may not contain decisions: anything testable without a browser
  belongs in the core.
