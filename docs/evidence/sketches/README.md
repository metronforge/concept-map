# Book sketches with preferred ELK pins

Each `<map-id>.json` scores one of the 23 book maps against its hand drawing.
The source map keeps the book's nodes, arrows, lanes, labels and scenarios,
removes resolved geometry, and pins each box at the hand drawing's centre.
The `hand` and `preferredElk` fields contain the same `check()` quality figures:
hard defects, crossings, bends and first-scenario reading share. The ELK field
also records mean and maximum distance from the pin to each drawn box centre.
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

Required pins currently draw 18 of 23 maps with both ELK and dagre. Every
drawn map has exact box centres and no more hard defects than its hand drawing.
The other five attempts fail during arrow routing. The per-map reports name
the arrows that prevent a result; they do not claim those sketches are
impossible. Selecting arrow ports from the pinned box positions lets the
channel router draw the horizontal peer arrows that previously retained
vertical engine ports.
