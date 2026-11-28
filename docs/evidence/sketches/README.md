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

Across 283 boxes, preferred ELK has 0 hard defects, 228 crossings and 1,050
bends, versus 14, 19 and 260 in the hand drawings. Its mean absolute pin
distance is 277.24 drawing units; the maximum is 948.81. After removing
translation, the mean is 172.56. Mean reading share is 0.852 for ELK and
0.667 for the hand drawings. Interactive layering alone kept 45 of 114
within-rank pairs (39.5%) with no crossings. Interactive crossing minimization
alone kept 84 pairs (73.7%) with 228 crossings; interactive node placement
alone kept 84 pairs with no crossings. Using both kept 110 pairs (96.5%) with
228 crossings. Interactive cycle breaking did not change that result.
Replacing interactive crossing minimization with semi-interactive crossing
minimization kept 84 pairs (73.7%) and no crossings, even with interactive
node placement. ELK's global interactive flag gave the same figures. Adding
semi-interactive crossing minimization to the interactive crossing strategy
left the 110 pairs and 228 crossings unchanged.

Preferred pins keep most sketch ranks, but order within a rank is not
guaranteed: 1,402 of 1,559 box pairs (89.9%) keep their hand rank order, and
110 of 114 pairs (96.5%) keep their order within a hand-drawn rank with the
selected option set. That set has zero hard defects but 228 crossings, above
the hand drawings' 19. Tested zero-crossing options kept at most 84 of 114
within-rank pairs (73.7%), short of the 90% target. No tested option met both
targets. Exact positions do not follow the sketch; use `required` pins for
them.

Required pins draw all 23 maps with both ELK and dagre. Every map has exact
box centres and no more hard defects than its hand drawing. Selecting arrow
ports from the pinned box positions lets the channel router draw horizontal
peer arrows that previously retained vertical engine ports. Where pinned
boxes overlap, arrows use ports outside both boxes instead of facing ports
inside their neighbour. Label placement also keeps arrow labels clear of step
numbers drawn on boxes.
