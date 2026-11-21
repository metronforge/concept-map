# Door: a finite state machine

[Open the example](https://metronforge.github.io/concept-map/examples/door/).

Follow states and transitions. A label reads event [guard] / action; pushing a locked door returns to the same state.

`index.html` has one module script from esm.sh and one
`<concept-map src="./map.json" layout="dagre">`. `map.json` contains meaning only:
no boxes, paths or label positions. No build tool or page-side adapter code is needed.

## Run locally

From the repository root, run `python3 -m http.server 8000` and open
`http://localhost:8000/examples/door/`. Use HTTP rather than opening the HTML
as a `file:` URL: the component fetches its JSON. Internet access is needed for esm.sh.

## What this example works around

- Rightward layout gives long transition labels more room than downward layout.
  It can still produce crowded routes; no coordinates are patched by the page.
- Initial and final pseudostates use short ordinary rectangular nodes (Start and End). There are no circle, bullseye or diamond shapes, and the source format does not offer a custom node size.
- The transition labels are text, not executable guards or actions. The scenario records a path; it does not simulate arbitrary input events.
- The locked-door push is a real self-edge, traversed once in the authored flow.
  In the current dagre output its route appears as a detached segment beside
  Locked rather than a loop attached to the box. The step text and log explicitly
  say that the state stays Locked; the page does not patch the generated path.

- The page stacks the diagram and explanation and caps the SVG at its natural width.
  A narrow viewport shrinks the diagram to fit without horizontal scrolling.
- Automatic step badges can cover edge text in Whole map mode. Step by step
  and the written explanation remain useful when a label is obscured.

<!-- x-release-please-start-version -->

The module and stylesheet use the published npm version 0.3.0 through esm.sh:

- Module: `https://esm.sh/@metronforge/concept-map@0.3.0/element`
- Stylesheet: `https://esm.sh/@metronforge/concept-map@0.3.0/css`

<!-- x-release-please-end -->

The page also supplies a readable width, a container for the player and host colours;
the package CSS is loaded separately from the script.
