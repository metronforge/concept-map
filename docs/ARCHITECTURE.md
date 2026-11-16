# Architecture of `@metronforge/concept-map`

Status: accepted; ADR 0005 open; ADR 0006 and 0010–0012 accepted for 0.2.0
when the author merges the pull request that adds them. Decisions and
their rejected alternatives are in [adr/](adr/); this file states the result.

The aim: every rule here is either checked by a tool in CI or written down
as a decision. A rule that is neither is not a rule.

## 1. Language

The glossary of `research/map-player/SPEC.md` §0 is binding: **resolved
map**, **scenario**, **step**, **hop**, **hop step**, **mode**, **revealed**,
**current**, **frame model**. One word, one meaning, in code, DOM, CSS and
docs. A new name needs a glossary entry in the same change.

Words of this document:

- **source map** — format-3 meaning without geometry; see [FORMAT.md](FORMAT.md).
- **layer** — a map-declared identifier and label, styled by the host.
- **core** — `schema`, `model`, `render`, `layout`: functions over data, with no DOM.
  Decisions are pure; layout receives an engine through its port.
- **shell** — `dom` and `element`: browser reads, writes and lifecycle.
- **port** — an interface the shell needs from the outside world
  (`Animator`, `Geometry`).
- **adapter** — an implementation of a port: a browser class or a layout engine adapter.
- **figure** — the complete map markup: diagram, scenario and mode controls,
  explanation, log and embedded map data, produced by `renderFigure`.
- **mount** — attach a player to a host: hydrate matching figure markup or
  render a new figure, then connect browser interaction (`./dom`).
- **hydrate** — keep an existing figure whose embedded map data matches the
  requested map and attach interaction to it.
- **element** — the `<concept-map>` custom element, registered by `./element`;
  it reads inputs and manages a player's browser lifecycle.
- **layout engine** — an implementation of `LayoutEngine` that places a graph's
  nodes and routes its edges, supplied to `layout()` through an adapter.
- **layout level** — `source` (meaning without geometry) or `resolved` (meaning
  with geometry). The schema module selects the level from geometry presence;
  selection is not validation of the geometry.

## 2. Contexts

```text
 book (Authoring context)                 library (Playing context)
 ───────────────────────                  ─────────────────────────
 authored map (YAML)                      resolved map (JSON)
 Playwright source refs, spreads   ──►    scenario, step, mode, frame
 page titles                     resolve
 anti-corruption layer:
 authored-schema, resolve-map
```

- The library accepts source and resolved maps; playback uses resolved maps.
  It has no word for Playwright,
  spreads, pages or Starlight.
- **Shared kernel**: `sourceMapSchema(leaf)` (meaning) and `mapSchema(leaf)`
  (resolved geometry), structural schemas with three
  open leaves (`text`, `source`, `deeper`). The book builds its authored
  schema from it; the library builds `ResolvedMapSchema` from it.
- The resolved map is plain JSON: it is rendered on a server, serialised into
  the page and read back in the browser. So core data has no methods.

## 3. Modules and the dependency rule

```text
schema  ◄──  model  ◄──  render  ◄──  dom  ◄──  element
(format)     (state,     (strings:    (ports,    (<concept-map>,
             frame,      SVG, HTML,   adapters,  inputs)
             flow)       text form)   MapPlayer,
                                      mount)
   ▲
   └──  layout  ◄──  layout/dagre, layout/elk
        (source map → resolved map through the LayoutEngine port; ADR 0011)
```

| Module         | Responsibility                                                                                                                                | May import                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `schema`       | The format: Zod schemas, inferred types, branded ids, layout level                                                                            | `zod`                                                       |
| `model`        | Player state and transitions (`reduce`), what is shown for a state (`derive`), the flow plan (`planFlow`), label fitting math, input priority | `schema` (types)                                            |
| `render`       | Frame → strings; pure comparison of embedded data for hydration. No player state                                                              | `schema`, `model`                                           |
| `dom/ports`    | Interfaces only; no DOM types in signatures                                                                                                   | `model` (types)                                             |
| `dom/adapters` | `WebAnimator`, browser geometry, `SvgDom`, `PanelDom`                                                                                         | everything above                                            |
| `dom/player`   | `MapPlayer`: wiring only — event → action → `reduce` → `derive` → adapters                                                                    | everything above                                            |
| `dom/mount`    | Read existing figure data, ask the core whether to hydrate, write markup and attach `MapPlayer`                                               | `schema` (types), `model`, `render`, `dom`                  |
| `element`      | `<concept-map>`: read inputs, ask the core to choose, fetch/parse, resolve and call `mount`; manage lifecycle                                 | `schema`, `model`, `dom`; selected layout entry dynamically |
| `layout`       | Source map → resolved map; the `LayoutEngine` port; no engine code                                                                            | `schema`                                                    |
| `layout/*`     | One adapter per engine (dagre, ELK); the only modules that import an engine                                                                   | `layout`                                                    |

Rules, each enforced in CI (ADR 0003):

1. Imports follow the arrows; no cycles (`dependency-cruiser`). `dom` cannot
   import the `element` entry or its implementation, including type-only imports.
2. The core compiles with `lib` without DOM (`tsconfig.core.json`).
3. Entry point `.` exports only the core; `./dom` exports the shell and
   `mount`; `./element` registers the custom element. This resolves debt D6.
4. Runtime dependencies: `zod` (peer). A layout engine is imported only by
   its adapter under `layout/` and is an optional peer dependency (ADR 0011);
   the core and DOM player entry points never load one. The element may
   dynamically load the selected adapter for a source map (ADR 0024).

## 4. Where objects, where functions (ADR 0001)

- **Core: values and functions.** The resolved map, `PlayerState`, `Frame`
  and `FlowPlan` are immutable data. `reduce`, `derive`, `planFlow` and the
  renderers are pure. Input priority lives in `model/input`; the figure reuse
  decision lives in `render/hydration`. Browser code supplies data and performs
  the selected action; discarded inputs are never parsed.
- **Player state is the one aggregate.** Its commands are the `Action`
  union; `reduce` is the only place that changes it; its invariants are §6.
- **Value objects are branded types** made only by the schema: `NodeId`,
  `EdgeId`, `ScenarioId`, `StepId`. A raw string does not type-check where
  an id is expected.
- **Shell: classes.** `MapPlayer` is the facade with a lifecycle
  (`destroy()`). Ports are interfaces; adapters are classes injected through
  the constructor. SOLID applies here: the facade depends on ports, not on
  adapters (D); a port has one consumer-shaped job (I); tests substitute
  fakes (L).
- Not used: repositories, factories, domain events, services. There is no
  storage, no transaction and one aggregate.

## 5. Contracts

The public surface is four contracts. Each has one source file, one test,
and a place in the versioning policy (ADR 0004).

| Contract       | Source of truth                                                   | Checked by                                                                                    |
| -------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Data format    | `schema` → generated source/resolved JSON Schemas, field `format` | freshness check in CI; book maps as fixtures                                                  |
| TypeScript API | entry points `.` and `./dom`                                      | `api-extractor` report `etc/concept-map.api.md` in the repository; a change shows in the diff |
| DOM contract   | `docs/DOM.md` (from SPEC §6): elements, `data-*`, classes, ARIA   | browser tests assert the table, not ad-hoc selectors                                          |
| Styling        | `docs/CSS.md`: custom properties `--cmap-*`                       | a test lists properties used in `css/` and compares with the doc                              |

## 6. Invariants

Each is one named property test (fast-check). The list is a starting point:
stage A confirms every line against the current code and golden snapshots
and reports the ones that do not hold instead of bending them. Stage A
changes no behaviour: where the code and an invariant differ, the
difference is recorded and the property describes what the code does.

| #   | Invariant                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | `reduce` is total and closed: for any valid map, state and action, the result is a valid state of that map                                                                             |
| I2  | `reduce` is the only writer: after any sequence of UI events the state equals the fold of the corresponding actions                                                                    |
| I3  | `derive` is deterministic and refers only to ids that exist in the map                                                                                                                 |
| I4  | In `step` mode, revealed grows with the step: revealed(i) ⊆ revealed(i+1)                                                                                                              |
| I5  | current ⊆ revealed                                                                                                                                                                     |
| I6  | Every hop of `planFlow` names an existing node, edge and hop step. Under reduced motion nothing is timed: the player does not use a plan, it shows the result of `reducedFlow` at once |
| I7  | Renderers escape: no text of the map reaches the output as markup                                                                                                                      |
| I8  | Server and browser agree: `renderSvg(map)` equals what the adapters show for the initial state                                                                                         |
| I9  | After `destroy()` the player holds no listener, observer or animation                                                                                                                  |

Model-based test: `fc.commands` drives a fake-port `MapPlayer` and the plain
fold of `reduce` side by side (I2). Mutation testing (Stryker) on `model`
and `render` measures the tests; the threshold is set from the first
measured score and only goes up (ADR 0008).

## 6a. Layout pipeline (accepted, built in 0.3.0)

[ADR 0025](adr/0025-layout-pipeline.md) replaces the single layout
port by stages — validate, measure, intent, place, route, label, shape,
report — over one `LayoutProblem` with typed constraints, with three ports
(`Measurer`, `Placer`, `Router`) and invariants I11–I16. Until it is built, the module table above describes the code;
[tasks/0.3.0.md](tasks/0.3.0.md) orders the work.

The measured `LayoutProblem` and internal `Placer` port now share the input
between dagre and ELK. Direction is preferred; lane containment and order are
required and independently verified from source intent and resolved geometry
in `layout/stages/constraints`. The quality report uses that same checker and
retains its reading-direction facts. Legacy `LayoutEngine` implementations
are bridged through their existing graph contract. Capability refusal, engine
failure and rejected results have distinct plain-data outcomes.
Only `layout/errors.ts` may declare classes in the core: the public boundary
converts outcomes to data-carrying exceptions there. The checker returns
constraint verdicts in its report, including for invalid hand drawings. The
remaining measurement, routing and label stages follow in later items.

## 7. Stage-A debt baseline

D1 is resolved by format 3 (ADR 0013); see `docs/DEBT.md` for current status.

Found by reading `src/lib/concept-map` at `main` b5adf04. Stage A moves the
code unchanged and records these in `docs/DEBT.md`; later stages remove them
one pull request each.

| #   | Finding                                                                                                                                                                                                | Breaks                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| D1  | `Layer` is a closed enum of Playwright words (`runner`, `client`, `server`, `page`, `browser`, …); `render/concepts.ts` writes `--pw-*` and special-cases `app` → `test`; the map has a field `spread` | §2: the library speaks book language (ADR 0006) |
| D2  | `MapPlayer` writes `this.current` directly on `pagehide`, bypassing `reduce`                                                                                                                           | I2                                              |
| D3  | Playback state (`flowId`, `log`, `playback`) lives in the facade, outside `PlayerState`; `startFlow` holds logic                                                                                       | §3: facade is wiring only (ADR 0005)            |
| D4  | `Geometry.textBox` takes an `SVGGraphicsElement`; ports and adapters share files (`animator.ts`, `geometry.ts`)                                                                                        | §3: ports have no DOM types                     |
| D5  | `PlayerState` and `Action` use positions (`scenario: number`) where the format has ids; ids are plain strings                                                                                          | §4: value objects                               |
| D6  | `index.ts` exports core and shell together                                                                                                                                                             | §3 rule 3                                       |

## 8. Budgets

- Size: six consumer scenarios have gzip limits (`size-limit`), including
  Zod when validation is used. Limits are the measured baseline plus 10%;
  see ADR 0015. The player budget now uses `./dom`; the component budget includes Zod.
- No `any`, no default exports, no `enum`, no classes in the core, including
  `src/layout` and its adapters, except the boundary exceptions in
  `src/layout/errors.ts` (lint).
- A source file over 200 lines or a function over 40 needs a reason in the
  pull request.

Layout is exposed through separate subpaths (ADR 0014). Its pure core depends
only on schema; optional dagre/ELK imports belong exclusively to adapters.
I10 is tested with generated synthetic graphs for both engines. Semantic source
references are validated before measurement or engine execution. See [LAYOUT](LAYOUT.md).
