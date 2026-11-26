# Review feedback without moving the plan

`map.json` has a plan that starts review and building. Rules also feed the
review. The review returns feedback to the plan. Without the
`free` hint or derived scenario intent, both engines place the plan below the
review and push building farther down. With the required hint,
both place the plan and rules first and route feedback around the
boxes. Derived intent also reverses return arrows during ranking, so the
columns with intent already keep the plan above review without the stated hint.

Run `npm run comparison:build`, serve `comparison-dist` over HTTP and open
`index.html#map-free`. The next section, `#map-free-plain`, removes only the
hint. Both sections show dagre and ELK with and without derived scenario
intent. The "without intent" columns still honor stated hints.

The checker reports `holds: null` for `free`: a drawing cannot prove whether
an arrow influenced ranking. The engine adapter excludes it during the second
placement, and the shared router draws it afterward.
