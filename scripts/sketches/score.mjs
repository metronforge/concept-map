import { mkdirSync, writeFileSync } from "node:fs";
import { layout } from "../../dist/layout/index.js";
import { elkEngine } from "../../dist/layout/elk.js";
import { dagreEngine } from "../../dist/layout/dagre.js";
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

function sketchOrder(source, hand, resolved) {
  const rankAxis = source.direction === "right" ? 0 : 1;
  const crossAxis = 1 - rankAxis;
  const centre = (box, axis) => box[axis] + box[axis + 2] / 2;
  const ids = Object.keys(hand.nodes);
  const rank = { matching: 0, pairs: 0 };
  const withinRank = { matching: 0, pairs: 0 };
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const first = hand.nodes[ids[i]].box;
      const second = hand.nodes[ids[j]].box;
      const axis =
        centre(first, rankAxis) === centre(second, rankAxis)
          ? crossAxis
          : rankAxis;
      const count = axis === rankAxis ? rank : withinRank;
      const handOrder = Math.sign(centre(first, axis) - centre(second, axis));
      if (handOrder === 0) continue;
      const drawnOrder = Math.sign(
        centre(resolved.nodes[ids[i]].box, axis) -
          centre(resolved.nodes[ids[j]].box, axis),
      );
      count.pairs++;
      if (drawnOrder === handOrder) count.matching++;
    }
  }
  return {
    rank: { ...rank, share: rank.pairs ? rank.matching / rank.pairs : null },
    withinRank: {
      ...withinRank,
      share: withinRank.pairs ? withinRank.matching / withinRank.pairs : null,
    },
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

async function requiredResult(manual, engine) {
  const source = sketchSource(manual, "required");
  try {
    const resolved = await layout(source, engine);
    const pins = pinDistances(source, resolved).absolute;
    const drawing = quality(source, resolved);
    return {
      status: "drawn",
      exact: pins.max <= 0.000001,
      withinHandDefects:
        drawing.hardDefects <= quality(source, manual).hardDefects,
      ...drawing,
      pinDistance: pins,
    };
  } catch (error) {
    return {
      status: "failed",
      reason: error.name,
      message: error.message,
      ...(error.conflicts ? { conflicts: error.conflicts } : {}),
    };
  }
}

function orderTotal(rows, kind) {
  const matching = rows.reduce(
    (sum, row) => sum + row.preferredElk.sketchOrder[kind].matching,
    0,
  );
  const pairs = rows.reduce(
    (sum, row) => sum + row.preferredElk.sketchOrder[kind].pairs,
    0,
  );
  return { matching, pairs, share: pairs ? matching / pairs : null };
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
    preferredElk: {
      ...quality(source, resolved),
      pinDistance: pins,
      sketchOrder: sketchOrder(source, manual, resolved),
    },
    requiredElk: await requiredResult(manual, elkEngine),
    requiredDagre: await requiredResult(manual, dagreEngine),
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
  handCrossings: rows.reduce((sum, row) => sum + row.hand.crossings, 0),
  handBends: rows.reduce((sum, row) => sum + row.hand.bends, 0),
  meanHandReadingShare:
    rows.reduce((sum, row) => sum + row.hand.readingShare, 0) / rows.length,
  preferredHardDefects: rows.reduce(
    (sum, row) => sum + row.preferredElk.hardDefects,
    0,
  ),
  preferredCrossings: rows.reduce(
    (sum, row) => sum + row.preferredElk.crossings,
    0,
  ),
  preferredBends: rows.reduce((sum, row) => sum + row.preferredElk.bends, 0),
  meanPreferredReadingShare:
    rows.reduce((sum, row) => sum + row.preferredElk.readingShare, 0) /
    rows.length,
  meanAbsolutePinDistance:
    rows.reduce(
      (sum, row) =>
        sum + row.boxes * row.preferredElk.pinDistance.absolute.mean,
      0,
    ) / rows.reduce((sum, row) => sum + row.boxes, 0),
  maximumAbsolutePinDistance: Math.max(
    ...rows.map((row) => row.preferredElk.pinDistance.absolute.max),
  ),
  meanTranslatedPinDistance:
    rows.reduce(
      (sum, row) =>
        sum + row.boxes * row.preferredElk.pinDistance.afterTranslation.mean,
      0,
    ) / rows.reduce((sum, row) => sum + row.boxes, 0),
  preferredRankOrder: orderTotal(rows, "rank"),
  preferredWithinRankOrder: orderTotal(rows, "withinRank"),
  requiredElkDrawn: rows.filter((row) => row.requiredElk.status === "drawn")
    .length,
  requiredDagreDrawn: rows.filter((row) => row.requiredDagre.status === "drawn")
    .length,
  requiredElkExact: rows.filter((row) => row.requiredElk.exact).length,
  requiredDagreExact: rows.filter((row) => row.requiredDagre.exact).length,
  requiredElkWithinHandDefects: rows.filter(
    (row) => row.requiredElk.withinHandDefects,
  ).length,
  requiredDagreWithinHandDefects: rows.filter(
    (row) => row.requiredDagre.withinHandDefects,
  ).length,
};
writeFileSync(
  `${destination}/summary.json`,
  JSON.stringify(summary, null, 2) + "\n",
);
