# ADR 0010: one integration for every stack

Status: accepted for 0.2.0

## Context

A user outside the book does not know yet whether the host page is plain
HTML or React, Angular, Vue, Astro or something else. Today the host must
write the figure markup of `docs/DOM.md` by hand (in the demo: one template
literal of about 1,500 characters) and then start `MapPlayer`.

## Options

1. Wrappers per framework (React component, Angular component, …).
2. A custom element, which every framework and plain HTML can use, plus a
   function for server rendering.
3. Documentation only.

## Decision

Option 2. Three ways in, from the simplest:

```html
<script type="module" src="…/@metronforge/concept-map/element"></script>
<concept-map src="coffee.json"></concept-map>
```

- `<concept-map>` (entry `./element`, registers the element when imported).
  Input: `src` (URL of a source or resolved map), or a child
  `<script type="application/json">`, or the `map` property. Light DOM, so
  the host's CSS and the `--cmap-*` properties apply. If the element
  already contains server-rendered markup, it upgrades it instead of
  rendering again.
- `mount(element, map, options) → MapPlayer` (entry `./dom`): the same
  without a custom element.
- `renderFigure(map, options) → string` (entry `.`): the complete figure
  markup for server rendering; `mount` and the element produce the same
  markup in the browser.

A source map (ADR 0011) is laid out on first use when the layout entry is
present; a resolved map is played directly.

No framework is a dependency or a peer. Framework wrappers, if anyone asks,
are separate packages.

## Consequences

- The figure markup is produced in one place (`renderFigure`); `docs/DOM.md`
  becomes a reference for styling and tests, not instructions for hosts.
- Entry points become `.` (core), `./dom`, `./element`, `./layout`,
  `./layout/dagre`, `./layout/elk`, `./css`, the JSON Schemas. This removes
  debt D6.
- A browser test runs the same map through all three ways and compares the
  DOM.
