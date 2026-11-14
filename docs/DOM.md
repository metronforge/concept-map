# DOM contract

## 6. DOM contract

CSS and tests depend on these names. They are part of the public API. In
this version they change only by the renames in the table below, so that
the DOM uses the words of §0. New `data-*` attributes may be added (for
example `data-edge`, `data-lane` and `data-frame` on the SVG groups, which
have no ids in today's DOM). No other name may change or disappear. The list
below is the minimum. Task stage 0 extracts the full list from
`src/styles/map.css`, `tests/book.spec.ts` and `src/components/callouts.ts`
and adds it here.

| Old name                       | New name                    | Used today in                                          |
| ------------------------------ | --------------------------- | ------------------------------------------------------ |
| `data-track`                   | `data-scenario`             | player, 21 places in `book.spec.ts`                    |
| `data-concept-track`           | `data-concept-scenario`     | player, `Concepts.astro`, 1 test                       |
| `data-role="tracks"`           | `data-role="scenarios"`     | `MapFigure.astro`, player                              |
| `data-role="nexttrack"`        | `data-role="nextscenario"`  | player                                                 |
| `data-view="step" \| "all"`    | `data-mode="step" \| "all"` | `MapFigure.astro`, player, 23 places in `book.spec.ts` |
| class `tracks` (`.seg.tracks`) | class `scenarios`           | `MapFigure.astro`, one selector in `map.css`, 1 test   |

Only the class is in CSS (one selector in `map.css`). The golden snapshots (stage 0) are taken with
the old names; the parity test does not depend on attribute names.

- Figure: `[data-figure="map"]`, `[data-map-data]`, `.map svg`,
  `[data-role="panel" | "more" | "scenarios" | "back" | "next" | "replay" |
"flowlog" | "nextscenario"]`, `[data-mode="step" | "all"]` with
  `aria-pressed`.
- Scenario chips: `[data-scenario="<scenario id>"]` with `aria-pressed`.
- Stepper: `[data-seg="<index>"]`, `aria-current="step"`, classes `done`,
  `now`; `.count` text `"<label> · Step i of n"` (`"Step i of n"` when
  `counterLabel` is false).
- Whole map: `[data-go="<index>"]`, `[data-li="<index>"].now`,
  `.line.old | .new | .err` in the flow log.
- SVG: `.lane`, `.frame`, `.node[data-node]`, `.edge`, `.etext`, `.badge`,
  `.badge.cur`, `.token`, `.token-glow`, state classes `ghost`, `cur`,
  `trail`, `visit`, `failnow`, `oknow`, `hl`, `.callout[data-callout]`.
- Panel: `.head h2`, `.log`, `.fix`, `.code .ttl`, `.code pre`, `.defs`,
  `.refs .src a`, `.hint`.
- Concepts: `[data-map-concepts] li[data-nodes]`, `[data-step]`,
  `[data-concept-scenario]`.

### 6.1 Extracted contract (stage 0)

Extracted from map.css, the map selectors in book.spec.ts, callouts.ts and
the existing component/player markup. The rename table above applies at
stage 5; shared prose-callout names remain owned by the book.

- Classes: `all`, `bad`, `badge`, `bar`, `below`, `callout`, `cgroup`, `cm`, `code`, `concepts`, `count`, `cur`, `custom`, `dash`, `deeper`, `def`, `defs`, `done`, `dot`, `edge`, `err`, `etext`, `fail`, `failnow`, `fix`, `flowbar`, `foot`, `frame`, `fwd`, `ghost`, `gloss`, `good`, `head`, `hint`, `hl`, `lane`, `line`, `log`, `map`, `map-concepts`, `map-deeper`, `map-figure`, `map-ui`, `meta`, `mono`, `more`, `n`, `nav`, `new`, `next`, `node`, `now`, `oknow`, `old`, `panel`, `prose`, `pwc`, `pwc-callout-token`, `pwc-fig`, `pwc-n`, `pwc-prose`, `refs`, `sbtn`, `seg`, `segs`, `src`, `stepper`, `tag`, `term`, `token`, `token-glow`, `tracks`, `trail`, `ttl`, `visit`.
- Attributes: `data-callout`, `data-callout-active`, `data-callout-paragraph-active`, `data-concept-track`, `data-figure`, `data-figure-callout`, `data-go`, `data-li`, `data-map-concepts`, `data-map-data`, `data-nodes`, `data-prose-callout`, `data-role`, `data-seg`, `data-step`, `data-view`.
- HTML/ARIA: figure id and tabindex=0, named Scenario and View button
  groups, aria-pressed on scenario/mode controls, aria-current=step,
  disabled boundary buttons, aria-live=polite panel, accessible SVG title,
  callout aria-controls/labels, linked figure/prose marker ids.
- Events: pwc-reveal-callout from prose to figure; mouseenter/leave and
  focusin/out on concepts; ArrowLeft/ArrowRight except in input/textarea/
  select; pagehide stops playback, pageshow(persisted) resets.
- SVG order: defs, lane/frame group, edges, nodes, edge text, badges,
  token/glow, callouts. Lanes/frames/edges retain authored key order.
- SVG attributes: viewBox, marker-end with per-figure marker id,
  visibility, cx/cy, textLength/lengthAdjust, and the measured label y
  positions/tspan x/y; label fitting must preserve them.
- Panel details move to .more in document order: in step mode, log, fix,
  code, defs, refs; in all mode, all-step list, flow log. The selector list
  in the old split() does not reorder them. Keyboard focus survives panel
  replacement.

## Stage A executable contract

The historical extraction above includes book-owned prose callouts and obsolete
attribute names for provenance. The current player uses `scenario` and `mode`.
The live announcement is a separate `role="status"` element, not a live panel.
The following machine-readable table is exercised against every demo map by
`test/browser/contracts.spec.ts`; detailed dynamic contracts remain covered by
`player-layers.spec.ts` and `player.spec.ts`. Prose callout interactions stay in
the book's integration suite.

<!-- contract-table
[
  {
    "selector": "[data-role=panel]"
  },
  {
    "selector": "[data-role=more]"
  },
  {
    "selector": "[data-role=scenarios]",
    "attribute": "role",
    "value": "group"
  },
  {
    "selector": "[data-mode=step]",
    "attribute": "aria-pressed",
    "value": "true"
  },
  {
    "selector": "[data-mode=all]",
    "attribute": "aria-pressed",
    "value": "false"
  },
  {
    "selector": "[data-seg='0']",
    "attribute": "aria-current",
    "value": "step"
  },
  {
    "selector": "[data-map-status]",
    "attribute": "role",
    "value": "status"
  },
  {
    "selector": ".map svg"
  },
  {
    "selector": ".map svg[aria-label]",
    "attribute": "role",
    "value": "img"
  },
  {
    "selector": "[data-map-data]",
    "attribute": "type",
    "value": "application/json"
  }
]
-->
