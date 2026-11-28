# Book sketches with preferred ELK pins

Each `<map-id>.json` scores one of the 23 book maps against its hand drawing.
The source map keeps the book's nodes, arrows, lanes, labels and scenarios,
removes resolved geometry, and pins each box at the hand drawing's centre.
The `hand` and `preferredElk` fields contain the same `check()` quality figures:
hard defects, crossings, bends and first-scenario reading share. The ELK field
also records mean and maximum distance from the pin to each drawn box centre.
`sketchOrder` compares every pair of box centres with the hand drawing. Pairs
at different hand ranks test order along the reading axis; pairs at the same
hand rank test order across it. Pairs tied on the tested axis are omitted.
Each report gives matching and eligible pair counts and their share;
`summary.json` weights every eligible pair equally across maps.
`requiredElk` and `requiredDagre` attempt the same source map with exact pins.
A drawn result records whether every centre is exact (within 0.000001 drawing
units), whether its hard defect count stays within the hand drawing's count,
and its quality figures. A failed result records the error type and message;
it contributes to neither success count in `summary.json`.

`pinDistance.absolute` uses the stated drawing coordinates. The optional
`afterTranslation` figure removes only the average x and y offset between the
two drawings; it helps distinguish a shifted drawing from a changed arrangement.
It does not affect the required absolute distance or any layout output. The
summary also totals crossings and bends, and gives the mean reading share
across maps. Each map has equal weight in that mean. These figures keep an
option that moves boxes nearer its pins from hiding a loss in arrow clarity.

Run `npm run build && node scripts/sketches/score.mjs` from the repository root
to regenerate the reports. `summary.json` aggregates the 23 per-map files.
The measurements use the server font table, as in the comparison page. The
browser visual checks use real fonts separately.

Across 283 boxes, preferred ELK has 0 hard defects, 0 crossings and 164 bends,
versus 14, 19 and 260 in the hand drawings. Its mean absolute pin distance is
360.03 drawing units; the maximum is 1,079.75. After removing translation,
the mean is 234.25. Mean reading share is 0.852 for ELK and 0.667 for the
hand drawings. These figures describe interactive layering. Adding
semi-interactive crossing minimization produced identical figures on all 23
maps, so the simpler option set is used. Other interactive options moved boxes
closer to pins but added crossings and bends; pin distance alone does not
decide sketch quality.

Preferred pins guide rank order: 1,402 of 1,559 box pairs (89.9%) keep their
hand rank order. Within a hand rank, only 45 of 114 pairs (39.5%) keep their
cross-axis order. ELK does not preserve exact positions or reliably keep the
order of parallel boxes; use `required` pins for exact positions.

Required pins draw all 23 maps with both ELK and dagre. Every map has exact
box centres and no more hard defects than its hand drawing. Selecting arrow
ports from the pinned box positions lets the channel router draw horizontal
peer arrows that previously retained vertical engine ports. Where pinned
boxes overlap, arrows use ports outside both boxes instead of facing ports
inside their neighbour. Label placement also keeps arrow labels clear of step
numbers drawn on boxes.
