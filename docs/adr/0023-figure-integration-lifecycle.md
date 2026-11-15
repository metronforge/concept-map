# ADR 0023: shared figure markup and explicit element inputs

Status: implemented for review as part of the integration in ADR 0010

## Decision

`renderFigure` owns the full figure markup and safely embeds the resolved map.
`mount` hydrates matching server data and returns a `MapPlayer`; otherwise it
renders the figure first. Hydration keeps the figure and SVG nodes, while the
existing player updates panels, fits labels and scopes markers. Remounting
destroys previous bindings. The root entry is DOM-free; browser exports move to
`./dom`. Only `./element` registers the custom element and is marked as a package
side effect so bundlers retain a bare registration import.

Element inputs have explicit precedence: property, URL, direct JSON, server
figure JSON. Invalid preferred input is an error, not a reason to silently use
another map. The element exposes `ready`, `player`, `mapready` and `maperror`.
Disconnect destroys playback and aborts fetch; reconnect starts fresh. Changing
input ignores stale asynchronous results. A delayed inline script is supported.

The element validates incoming maps with Zod. A resolved map loads no engine.
Initially, a source map used only the host's `layout` callback (ADR 0024
adds explicit lazy engine selection); documentation uses dagre, the
default chosen in ADR 0022. This keeps engine loading out of this task and makes
the pre-resolved component's size independent of either engine. Merely importing
`./layout` does not mutate global registration state.

## Alternatives

Duplicating figure templates would let the three integrations drift. A shadow
root would hide the existing styling contract. Automatically loading an engine
would couple integration to a bundling and CDN strategy, which is separate work.
Global layout registration would introduce import-order dependence. A callback
makes that dependency explicit and works with build tools and async loading.

## Evidence

One browser test compares the same map's DOM and state changes through server
rendering plus mount, browser mounting, and element hydration. It normalizes only
per-instance marker ids. Additional tests cover input precedence, loading errors,
late responses, lifecycle cleanup and explicit source layout. The component size
scenario includes Zod and excludes engines; its measured budget is recorded in
ADR 0015.
