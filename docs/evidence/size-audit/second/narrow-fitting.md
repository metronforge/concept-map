# Narrow fitting and hint verdict costs

The [omission reports](omissions/) estimate gzip cost at the current module
boundaries. They use the same esbuild consumer builds as the module reports.
Each experiment replaces the named module with an external `audit:` reference,
then measures the remaining static download, including any dependencies that
still survive tree shaking. The reference itself remains in the measured bytes.
The narrow-fitting experiment instead removes only the `fitCandidates` body
in memory and externalizes the cache, preserving wide fitting and label checks.

These are deliberately non-runnable measurement bundles, never shipped or
used for tests. Differences include shared chunks, orphaned dependencies,
import overhead and compression changes. They are not additive, and they are
not promised savings from an on-demand implementation. In particular, removing
all of `dom/refine` also removes essential wide-map refinement; its large
number must not be described as the cost of narrow fitting alone.

| Omitted code                                    | Component gzip difference | Player gzip difference |
| ----------------------------------------------- | ------------------------: | ---------------------: |
| Narrow fitting body and cache                   |                     275 B |                1,268 B |
| `dom/refine` (wide and narrow fitting)          |                   8,628 B |                7,150 B |
| `dom/narrowLayout` (cache and pending requests) |                     131 B |                  128 B |
| `dom/resize`                                    |                      49 B |                   43 B |
| `layout/stages/presentation`                    |                     177 B |                   97 B |
| `layout/stages/hard-check`                      |                   1,158 B |                  976 B |
| `layout/stages/hints` (geometry verdicts)       |                     564 B |                  424 B |
| `layout/hints` (hint helpers)                   |                     220 B |                   80 B |
| Both hint modules together                      |                     563 B |                  424 B |

The complete baselines are 51,676 B for the component and 16,795 B for the
player. These are esbuild figures, not the Size Limit acceptance measures.
The component shares checking code with deferred layout chunks, so omitting
its narrow-fitting caller does not remove as much code as in the player.
The hint rows overlap the hard-check and narrow-fitting rows. Hint verdicts
stay because narrow-candidate rejection uses them; they are not merely
optional report text. The [module table](README.md#what-grew-and-which-consumers-need-it)
and [current JSON reports](current/) also record each module's uncompressed
minified contribution.

## Candidate for 0.4.0

Loading narrow fitting on demand could avoid some initial code for maps that
never need it. This audit does not implement that change: it would introduce
an asynchronous boundary and change timing on narrow screens. Any later design
must preserve the synchronous wide/panel choice before requesting a candidate,
including the return-width rule and hidden-container behavior.

A pending import or layout must not apply results for an obsolete width,
replaced map, disconnected element or destroyed player. Keep the one-width
cache, ignore stale requests and preserve error delivery. When geometry is
accepted, restore the chosen SVG before paint, update panel labels, and retarget
active playback without restarting it or reviving stopped animation. Fonts,
resize, reduced motion and reconnects must retain their current behavior.
Measure both browser consumers again: moving an import alone does not guarantee
that shared chunks leave the first download, and the synchronous check still
needs required hint verdicts.
