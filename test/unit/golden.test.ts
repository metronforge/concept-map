import { expect, test } from "vitest";
import { createHash } from "node:crypto";
import golden from "../fixtures/render-golden.json";
import { resolvedMaps } from "./fixtures/maps";
import {
  derive,
  renderSvg,
  renderPanel,
  renderConcepts,
  renderDeeper,
} from "../../src/index";
import type { PlayerState } from "../../src/index";
test("all 1050 book renders preserve the oracle apart from documented layer CSS names", () => {
  // Natural-size caps change SVG sizing, not its drawing; normalize only that attribute.
  // ADR 0006 changes only these colour references. Never regenerate the oracle.
  expect(golden).toHaveLength(1050);
  const maps = Object.fromEntries(
    resolvedMaps().map(({ id, map }) => [id, map]),
  );
  for (const { id, state, sha256 } of golden) {
    const map = maps[id],
      frame = derive(map, state as PlayerState);
    expect(
      createHash("sha256")
        .update(
          JSON.stringify([
            renderSvg(map, { frame })
              .replace(/ style="max-width:[0-9.]+px"/, "")
              .replace(
                /style="--c:var\(--cmap-layer-([A-Za-z][A-Za-z0-9_-]*),var\(--cmap-layer\)\)"/g,
                'style="--c:var(--$1)"',
              ),
            renderPanel(map, frame),
            renderConcepts(map).replace(
              /style="--c:var\(--cmap-layer-([A-Za-z][A-Za-z0-9_-]*),var\(--cmap-layer\)\)"/g,
              (_, layer) =>
                `style="--c:var(--pw-${layer === "app" ? "test" : layer})"`,
            ),
            renderDeeper(map),
          ]),
        )
        .digest("hex"),
      `${id} ${JSON.stringify(state)}`,
    ).toBe(sha256);
  }
});
