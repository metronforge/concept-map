# Do layout hints restore the reading order?

A throwaway experiment for the layout pipeline proposal. `spike.mjs` lays out
the three examples with ELK 0.12.1, dagre 3.1.3 and Graphviz dot (WebAssembly
build 1.30.0), with fixed 120×44 boxes, first as the map is written ("plain")
and then with three hints derived from the first scenario ("hints"):

- nodes are given in the order the scenario first visits them;
- edges of that scenario form the main path and get more weight;
- an edge that returns to an already visited node does not constrain ranks.

Columns: forward main-path edges that advance along the reading direction;
node order along that direction; drawing size.

| Example        | Engine | Plain                                     | Hints                                        |
| -------------- | ------ | ----------------------------------------- | -------------------------------------------- |
| Coffee (right) | ELK    | 1/2 · barista → guest → cashier · 420×63  | 2/2 · guest → cashier → barista · 400×48     |
|                | dagre  | 2/2 · guest → cashier → barista · 460×101 | same                                         |
|                | dot    | 2/2 · guest → cashier → barista · 497×76  | 2/2 · same order · 497×44 (one straight row) |
| Door (right)   | ELK    | 4/4 · 430×182                             | 4/4 · 430×172                                |
|                | dagre  | 4/4 · 460×262                             | 4/4 · 460×262                                |
|                | dot    | 4/4 · 494×203                             | 4/4 · 494×218                                |
| Euclid (down)  | ELK    | 4/4 · 260×246                             | 4/4 · 261×246                                |
|                | dagre  | 4/4 · 290×326                             | 4/4 · 310×326                                |
|                | dot    | 4/4 · 258×334                             | 4/4 · 258×334                                |

Findings: the hints repair the one wrong reading order (ELK on the coffee
shop) and make it the most compact drawing; with hints dot draws the coffee
shop as one straight row; ELK is the most compact engine on all three maps.
Node order alone does not measure label overlaps or routing; those need the
quality report of the proposal.

Run: `npm i elkjs @dagrejs/dagre @hpcc-js/wasm-graphviz` in a scratch folder,
adjust the path to `examples/`, `node spike.mjs`.
