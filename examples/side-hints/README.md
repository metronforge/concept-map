# Choose where an arrow meets a box

The source in `map.json` asks ELK to attach the Retry self-loop to the top
of Waiting, and Send to the right of Waiting and the left of Ready.
Remove `layout` to compare the engine's automatic attachment choices.
There are no coordinates in the source. Downward layout keeps the example
readable at page text size on narrow screens.

Run `npm run comparison:build`, serve `comparison-dist` over HTTP and open
its `index.html`. The side-hints section shows this map. Both ELK columns
honour the stated sides; the plain column disables only derived scenario
preferences. Dagre reports these preferred hints as unsupported.

The hints use the default `preferred` strength so both engines can appear
in the comparison. With `"strength": "required"`, ELK enforces the same
sides and dagre refuses layout with the hint's path and edge id.
`check(source, resolved).constraints` reports each endpoint independently.

This example needs the package version that introduces `layout.hints` or
newer; it does not work with the published 0.2.1 format validator.
