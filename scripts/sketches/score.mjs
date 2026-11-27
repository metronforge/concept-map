import { mkdirSync, writeFileSync } from "node:fs";
import { layout } from "../../dist/layout/index.js";
import { elkEngine } from "../../dist/layout/elk.js";
import { bookMaps, sketchSource } from "../comparison/maps.mjs";
import { geometryMetrics } from "../comparison/metrics.mjs";

const destination = "docs/evidence/sketches";

function pinDistances(source, resolved) {
  const offsets = source.layout.hints
    .filter((hint) => hint.kind === "pin")
    .map(({ node, at }) => {
      const [x, y, width, height] = resolved.nodes[node].box;
      return [x + width / 2 - at[0], y + height / 2 - at[1]];
    });
  const offset = [0, 1].map(
    (axis) =>
      offsets.reduce((sum, point) => sum + point[axis], 0) / offsets.length,
  );
  const distances = (shift) =>
    offsets.map(([x, y]) => Math.hypot(x - shift[0], y - shift[1]));
  const summary = (values) => ({
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    max: Math.max(...values),
  });
  return {
    absolute: summary(distances([0, 0])),
    afterTranslation: summary(distances(offset)),
  };
}

function quality(source, resolved) {
  const result = geometryMetrics(source, resolved);
  return {
    hardDefects: result.hard,
    crossings: result.crossings,
    bends: result.bends,
    readingShare: result.reading,
  };
}

mkdirSync(destination, { recursive: true });
const rows = [];
for (const { id, manual, note } of bookMaps()) {
  const source = sketchSource(manual);
  const resolved = await layout(source, elkEngine);
  const pins = pinDistances(source, resolved);
  const row = {
    id,
    boxes: Object.keys(manual.nodes).length,
    ...(note ? { note } : {}),
    hand: quality(source, manual),
    preferredElk: { ...quality(source, resolved), pinDistance: pins },
  };
  writeFileSync(
    `${destination}/${id}.json`,
    JSON.stringify(row, null, 2) + "\n",
  );
  rows.push(row);
}
const summary = {
  maps: rows.length,
  boxes: rows.reduce((sum, row) => sum + row.boxes, 0),
  handHardDefects: rows.reduce((sum, row) => sum + row.hand.hardDefects, 0),
  preferredHardDefects: rows.reduce(
    (sum, row) => sum + row.preferredElk.hardDefects,
    0,
  ),
  meanAbsolutePinDistance:
    rows.reduce(
      (sum, row) =>
        sum + row.boxes * row.preferredElk.pinDistance.absolute.mean,
      0,
    ) / rows.reduce((sum, row) => sum + row.boxes, 0),
  maximumAbsolutePinDistance: Math.max(
    ...rows.map((row) => row.preferredElk.pinDistance.absolute.max),
  ),
};
writeFileSync(
  `${destination}/summary.json`,
  JSON.stringify(summary, null, 2) + "\n",
);
