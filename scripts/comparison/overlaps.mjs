import { measureLabel } from "../../dist/layout/measure.js";
const intersects = (a, b) =>
  Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]) > 1e-7 &&
  Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) > 1e-7;
/** Compare edge-label rectangles in SVG units; labels inside their own nodes are not edge labels. */
export function labelOverlaps(map, measure = measureLabel) {
  const labels = Object.entries(map.edges)
    .filter(([, e]) => e.label?.text)
    .map(([id, e]) => {
      const size = measure(e.label.text, { fontSize: 10.5, mono: true });
      // Renderer baseline is centre + height/3; invert it to recover the label box.
      return {
        id,
        box: [
          e.label.at[0],
          e.label.at[1] - (size.height * 5) / 6,
          size.width,
          size.height,
        ],
      };
    });
  const nodes = [],
    pairs = [];
  for (let i = 0; i < labels.length; i++) {
    const a = labels[i];
    for (const [node, n] of Object.entries(map.nodes ?? {}))
      if (intersects(a.box, n.box)) nodes.push({ label: a.id, node });
    for (let j = i + 1; j < labels.length; j++)
      if (intersects(a.box, labels[j].box)) pairs.push([a.id, labels[j].id]);
  }
  return {
    labelNodeOverlaps: nodes.length,
    labelLabelOverlaps: pairs.length,
    labelOverlapDetails: { nodes, labels: pairs },
  };
}
