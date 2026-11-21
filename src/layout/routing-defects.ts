import type { ResolvedMap, SourceMap } from "../schema.js";
import type { Drawn } from "./stages/drawn.js";
import { contactInputs } from "./stages/contact-inputs.js";
import { contactLists, hardReport } from "./stages/hard-check.js";
import { segmentRectGap } from "./stages/plane.js";
import type { CheckOptions, Contact } from "./stages/quality.js";

/** New hard contacts after routing, identified individually rather than by
 * total count. Required constraints are checked separately by the caller.
 * Endpoint boxes use the same contact bands as the rest of the drawing.
 */
export function newRoutingDefects(
  source: SourceMap | ResolvedMap,
  before: ResolvedMap,
  after: ResolvedMap,
  options: CheckOptions = {},
  afterOptions: CheckOptions = options,
): Contact[] {
  const existing = new Set(routingContacts(source, before, options).map(key));
  return routingContacts(source, after, afterOptions).filter(
    (contact) => !existing.has(key(contact)),
  );
}

const key = ({ a, b }: Contact) => JSON.stringify([a, b].sort());

function routingContacts(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  options: CheckOptions,
): Contact[] {
  const input = contactInputs(source, resolved, options);
  distinguishRepeats(input.shapes, resolved);
  const contacts = contactLists(hardReport(source, resolved, input)).flat();
  const boxes = new Map(input.shapes.nodes.map((n) => [n.id, n.box]));
  for (const edge of input.shapes.edges)
    for (const id of new Set([edge.from, edge.to])) {
      const box = boxes.get(id)!;
      let gap = Infinity;
      for (const line of edge.lines)
        for (let i = 1; i < line.length; i++)
          gap = Math.min(gap, segmentRectGap(line[i - 1], line[i], box));
      input.judge(contacts, `node:${id}`, `line:${edge.id}`, gap);
    }
  return contacts.filter((contact) => contact.band === "defect");
}

/** The report names repeats by step; comparison needs each badge's identity. */
function distinguishRepeats(shapes: Drawn, resolved: ResolvedMap): void {
  shapes.steps = shapes.steps.filter((step) => !step.id.startsWith("repeat:"));
  resolved.scenarios.forEach((scenario, i) => {
    scenario.repeatBadges?.forEach((badge, j) => {
      shapes.steps.push({ id: `repeat:${i}:${j}:${badge.step}`, at: badge.at });
    });
  });
}
