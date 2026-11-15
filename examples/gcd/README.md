# Euclid's greatest common divisor

[Open the example](https://metronforge.github.io/concept-map/examples/gcd/).

Follow a recorded run of Euclid’s algorithm. Compare three turns of the loop with an input that needs no loop.

`index.html` has one module script from esm.sh and one
`<concept-map src="./map.json" layout="dagre">`. `map.json` contains meaning only:
no boxes, paths or label positions. No build tool or page-side adapter code is needed.

## Run locally

From the repository root, run `python3 -m http.server 8000` and open
`http://localhost:8000/examples/gcd/`. Use HTTP rather than opening the HTML
as a `file:` URL: the component fetches its JSON. Internet access is needed for esm.sh.

## What this example works around

- Repeat badges for different turns share a point in Whole map mode. Select
  Loop 1, Loop 2 or Loop 3 in Step by step to see its individual badge.
- The flow is a hand-written trace, not an interpreter. It records all three loop turns for (48, 18); no JavaScript computes a run on the page.
- Values of a, b and r live in step text and log lines until a state panel exists.
- The b = 0? test is a rectangular node until diamond shapes exist. Repeat badges name the same loop edge at three steps; their positions come from layout, not coordinates in the source.

- The page stacks the diagram and explanation and gives the SVG a minimum width.
  A narrow viewport scrolls the diagram instead of shrinking transition labels.
- Automatic step badges can cover edge text in Whole map mode. Step by step
  and the written explanation remain useful when a label is obscured.

The 0.2.0 package is not published yet, so both the module and stylesheet use
main commit `b989ffa568b74e53e0b29711ca0e909cc564fab5` through esm.sh's GitHub support. After release,
replace those two URLs with the pinned npm version (`/element` and `/css`).
The page also supplies a readable width, a container for the player and host colours;
the package CSS is loaded separately from the script.
