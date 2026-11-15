# ADR 0022: dagre is the default layout engine

Status: accepted (author, 2026-11-15)

## Context

The live comparison laid out the 23 book maps and the coffee shop with both
engines, next to the hand-drawn maps. Totals over all 24 maps:

|                                  | Hand |   dagre |     ELK |
| -------------------------------- | ---: | ------: | ------: |
| Edge crossings                   |   19 |       7 |       0 |
| Labels over boxes                |    2 |       4 |       0 |
| Labels over labels               |    0 |       6 |       0 |
| Area (million units²)            |  6.5 |    17.3 |    17.3 |
| Bundle with engine and Zod, gzip |    — |   48 kB |  479 kB |
| Layout time per map              |    — | 2–10 ms | 7–40 ms |

The hand-drawn maps read best, although they have the most crossings. Neither
engine knows the reading order or the main path: in the coffee shop, ELK put
the barista before the guest; on large book maps ELK grew long and narrow to
make room for labels. ELK routes arrows more cleanly and never overlaps labels.

## Decision

- **dagre is the default** whenever a map is laid out automatically: in the
  custom element, in examples and in documentation. It is ten times smaller
  and several times faster, and on small maps it is as readable as ELK.
- **ELK stays a supported adapter** for large maps where clean routing matters
  more than download size, or where layout runs at build time and size does not
  matter.
- Quality close to hand-drawn maps is expected from hints and relative
  placement (ADR 0021), not from either engine. The choice of default engine is
  revisited when hints exist, because ELK supports keeping the map's order
  better than dagre.

## Consequences

- Hosts that lay out in the browser load about 48 kB once; pages that ship
  laid-out maps load no engine.
- The comparison page stays, so the decision can be checked again on new
  examples.
