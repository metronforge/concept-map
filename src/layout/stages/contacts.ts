import type { Contact, LayoutReport } from "./quality.js";
import type { Drawn } from "./drawn.js";
import {
  circleGap,
  circleRectGap,
  crossings,
  rectGap,
  segmentRectGap,
  type Rect,
  type Vec,
} from "./plane.js";

/** Records a contact when the gap is below the margin. */
export type Judge = (
  list: Contact[],
  a: string,
  b: string,
  gap: number,
) => void;

export function crossingPairs({ edges }: Drawn): LayoutReport["crossings"] {
  const result: LayoutReport["crossings"] = { count: 0, pairs: [] };
  edges.forEach((e, i) => {
    for (const other of edges.slice(i + 1)) {
      let count = 0;
      for (const a of e.lines)
        for (const b of other.lines) count += crossings(a, b).length;
      if (!count) continue;
      result.count += count;
      result.pairs.push([e.id, other.id]);
    }
  });
  return result;
}

export function labelContacts(d: Drawn, judge: Judge): LayoutReport["labels"] {
  const out: LayoutReport["labels"] = { labels: [], lines: [], boxes: [] };
  d.labels.forEach((label, i) => {
    const a = `label:${label.id}`;
    for (const other of d.labels.slice(i + 1))
      judge(out.labels, a, `label:${other.id}`, rectGap(label.box, other.box));
    for (const e of d.edges)
      judge(out.lines, a, `line:${e.id}`, lineGap(e.lines, label.box));
    for (const n of d.nodes)
      judge(out.boxes, a, `node:${n.id}`, rectGap(label.box, n.box));
  });
  return out;
}

export function stepContacts(d: Drawn, judge: Judge): LayoutReport["steps"] {
  const out: LayoutReport["steps"] = { labels: [], boxes: [], steps: [] };
  const r = d.radius;
  d.steps.forEach((step, i) => {
    for (const label of d.labels)
      judge(
        out.labels,
        `label:${label.id}`,
        step.id,
        circleRectGap(step.at, r, label.box),
      );
    for (const n of d.nodes)
      judge(
        out.boxes,
        `node:${n.id}`,
        step.id,
        circleRectGap(step.at, r, n.box),
      );
    for (const other of d.steps.slice(i + 1))
      judge(out.steps, step.id, other.id, circleGap(step.at, r, other.at, r));
  });
  return out;
}

export function lineContacts(d: Drawn, judge: Judge): LayoutReport["lines"] {
  const out: LayoutReport["lines"] = { boxes: [] };
  for (const e of d.edges)
    for (const n of d.nodes)
      if (n.id !== e.from && n.id !== e.to)
        judge(
          out.boxes,
          `node:${n.id}`,
          `line:${e.id}`,
          lineGap(e.lines, n.box),
        );
  return out;
}

function lineGap(lines: Vec[][], box: Rect): number {
  let gap = Infinity;
  for (const line of lines)
    for (let k = 1; k < line.length; k++)
      gap = Math.min(gap, segmentRectGap(line[k - 1], line[k], box));
  return gap;
}
