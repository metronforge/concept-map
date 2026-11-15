# ADR 0014: explicit layout engines and validation boundary

Status: accepted

## Context

ADR 0011 requires a DOM-free layout port, interchangeable dagre and ELK adapters,
label measurement and I10. Task item 3 also closes D7 for source maps without
choosing the main engine or comparing layouts (item 4).

## Decision

Expose layout and adapters through separate package subpaths. Engines are optional
peers and imported only by their adapters. The root/player never imports them.
The port takes measured labels and returns boxes and polylines. It does not expose
engine-specific types. Complete hand geometry is preserved; partial geometry is
invalid. Validate all semantic references before measurement or engine execution,
and validate the resolved result. Keep structural schemas separately usable.

Use a deterministic committed font advance table by default. Allow an injected
measurer, with a separate DOM implementation for host fonts. I10 holds for a fixed
engine, version, input and measurer. Approximate default metrics cannot promise
pixel equivalence to every host font.

Preserve declared vertical lane order. ELK uses its native partitioning with
connected-component separation disabled. Dagre lacks that constraint: stack lane
groups after layout, translate their internal routes and reroute cross-lane edges.
Internal anchors reserve empty lanes. No default engine is selected.

## Consequences

Source maps fail early with field paths and unknown IDs. Invalid resolved maps
also fail when explicitly passed through layout; direct player input retains its
existing contract. Synthetic property tests exercise both engines without
performing the deferred book-map engine comparison. Existing hand-render goldens
remain the compatibility evidence. See [the layout API](../LAYOUT.md).

## Review update: direction and edge labels

Maps may declare direction down or right; omission keeps existing downward
behavior. The measured graph carries that optional value. Both adapters set their
engine's direction and arrange declared lane partitions along that axis. Node and
label dimensions remain unrotated. Rightward lanes reserve header space with
internal anchors, and their titles follow the lane's x position. Hand geometry
is still passed through unchanged. This is an axis choice, not an ordering
constraint for cycles; the proposed relative-placement work remains separate.

The ELK adapter now passes nonempty text as well as measured width and height for
edge labels, requests centre placement and reads the returned label coordinates.
ELK ignored the previous empty text. Size-only or empty labels use a placeholder
inside the adapter; output text remains the original map's text.
