# Put parallel outcomes on the same row

`map.json` has two paths: Start → Quick and Start → Prepare → Finish.
Quick and Finish are parallel outcomes, but both engines normally put Quick
one rank earlier because its path has fewer arrows. The required `sameRank`
hint puts the outcomes on one row without specifying coordinates.

Run `npm run comparison:build`, serve `comparison-dist` over HTTP and open
`index.html#map-same-rank`. The next section, `#map-same-rank-plain`, removes
only the hint. Each section shows dagre and ELK, with and without derived
scenario intent. The columns labelled “without intent” still honour stated
hints; the separate section is the comparison without the hint.

The source uses `direction: "down"` to fit narrow screens at page text size.
Changing it to `"right"` aligns the outcomes in a column instead. Only boxes
that need to move and their affected arrows change. Forward-arrow gaps and
lane order take precedence: aligning two boxes on one forward path, or in
different lanes, is a contradiction.

A required contradiction throws an error naming the hint and its conflicting
arrows or lanes. A preferred contradiction is dropped and reported through
`onUnsupportedHints` with `reason: "contradiction"`. Routes currently stretch
with moved boxes. If that adds a hard defect, a required hint throws a routing
error; a preferred hint is dropped with `reason: "unsupported"` and arrow ids.

See [the evidence](../../docs/evidence/same-rank/README.md) for server and
real-font browser checks. This example needs the version that adds same-rank
alignment; the published 0.2.1 validator does not support `layout.hints`.
