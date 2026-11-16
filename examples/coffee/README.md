# Coffee shop

[Open the example](https://metronforge.github.io/concept-map/examples/coffee/).

Follow an order from guest to cashier to barista. Switch to Out of milk to see the alternative.

`index.html` has one module script from esm.sh and one
`<concept-map src="./map.json" layout="dagre">`. `map.json` contains meaning only:
no boxes, paths or label positions. No build tool or page-side adapter code is needed.

## Run locally

From the repository root, run `python3 -m http.server 8000` and open
`http://localhost:8000/examples/coffee/`. Use HTTP rather than opening the HTML
as a `file:` URL: the component fetches its JSON. Internet access is needed for esm.sh.

## What this example works around

- Scenarios and their flows are written separately: the player does not infer a flow from the edges or steps. The short map repeats the order in both scenarios.
- A missing ingredient is explained in step text and log lines. There is no variable/state panel.
- Return arrows make a cycle. Dagre chooses their routes; this example supplies no geometry or routing fixes.

- The page stacks the diagram and explanation and caps the SVG at its natural width.
  A narrow viewport shrinks the diagram to fit without horizontal scrolling.
- Automatic step badges can cover edge text in Whole map mode. Step by step
  and the written explanation remain useful when a label is obscured.

<!-- x-release-please-start-version -->

The module and stylesheet use the published npm version 0.2.0 through esm.sh:

- Module: `https://esm.sh/@metronforge/concept-map@0.2.0/element`
- Stylesheet: `https://esm.sh/@metronforge/concept-map@0.2.0/css`

<!-- x-release-please-end -->

The page also supplies a readable width, a container for the player and host colours;
the package CSS is loaded separately from the script.
