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
test("all renderer outputs equal the frozen pre-extraction book oracle", () => {
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
            renderSvg(map, { frame }),
            renderPanel(map, frame),
            renderConcepts(map),
            renderDeeper(map),
          ]),
        )
        .digest("hex"),
      `${id} ${JSON.stringify(state)}`,
    ).toBe(sha256);
  }
});
