# Sketch box positions

`map.json` sketches four box centres: Draft at `[140, 80]`, Review at
`[210, 220]`, Approve at `[70, 220]`, and Publish at `[140, 360]`.
These are drawing units. Review and approval are parallel paths; both lead to
publication. Each pin defaults to `preferred`, so ELK may move its box while
keeping the sketch as a starting point.

Run `npm run comparison:build`, serve `comparison-dist` over HTTP, and open
`index.html#map-sketch`. The adjacent `#map-sketch-plain` section removes the
pins. `#map-sketch-required` changes each pin to `strength: "required"` and
places every box centre exactly at the stated point. Both engines support the
required variant through the on-demand relation solver. The sections use the
same nodes, arrows, labels and scenario; only pin strength differs.

The comparison columns still vary derived scenario intent independently of
the pins. Open each section's JSON source to see the actual hint list. A
preferred pin's `check()` result reports its distance from the drawn centre;
a required pin holds only when that distance is zero within measurement
tolerance.
