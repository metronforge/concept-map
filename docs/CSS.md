# CSS contract

Import `@metronforge/concept-map/css`. Set these properties on the figure or a host rule. Defaults are neutral; the book supplies its existing theme.

- `--cmap-accent` — host colour.
- `--cmap-accent-low` — host colour.
- `--cmap-frame` — frame outline colour.
- `--cmap-success` — successful code-line colour.
- `--cmap-fail` — failure state, token and error code/log colour (not a layer).
- `--cmap-layer` — fallback layer colour (`#526a8a`).
- `--cmap-bg` — host colour.
- `--cmap-border` — host colour.
- `--cmap-fg` — host colour.
- `--cmap-font-mono` — font family.
- `--cmap-font-sans` — font family.
- `--cmap-muted` — host colour.
- `--cmap-muted-fg` — host colour.
- `--cmap-node` — host colour.
- `--cmap-text-accent` — host colour.

For each key in a map's `layers`, set `--cmap-layer-<id>` on the figure and
concept container. Nodes, lanes and concept dots use that property, falling back
to `--cmap-layer`. Layer ids use the schema's CSS-safe identifier grammar.
There is no built-in layer list or special case for a layer named `app`.

```css
.map-ui {
  --cmap-layer-service: #526a8a;
  --cmap-layer-guest: #8a526a;
}
```

The old named properties (for example `--cmap-<old-layer>`) and internal aliases
(for example `--client`), and concept references to `--pw-*`, are removed.
Hosts can map existing colours to `--cmap-layer-<id>` themselves. `--c` and
`--map-label-min` remain internal. DOM classes and functional layout are unchanged.
Book spacing remains the host's responsibility.

The old frame colour input becomes `--cmap-frame`, and the successful code-line
colour becomes `--cmap-success`. Their neutral defaults are unchanged.
