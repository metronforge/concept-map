import type { SourceMap, ResolvedMap } from "../schema.js";
type MapData = SourceMap | ResolvedMap;
type Check = (
  path: string,
  kind: string,
  id: string | undefined,
  values: object | readonly string[],
) => void;

function unique(
  ids: string[],
  path: string,
  kind: string,
  errors: string[],
  field = ".id",
) {
  const seen = new Set<string>();
  ids.forEach((id, i) => {
    if (seen.has(id))
      errors.push(`${path}[${i}]${field}: duplicate ${kind} “${id}”`);
    seen.add(id);
  });
}
function steps(
  map: MapData,
  s: MapData["scenarios"][number],
  path: string,
  check: Check,
) {
  s.steps.forEach((step, i) => {
    const p = `${path}.steps[${i}]`;
    for (const field of ["show", "current"] as const)
      for (const id of step[field])
        check(`${p}.${field}`, "node", id, map.nodes);
    for (const id of step.edges) check(`${p}.edges`, "edge", id, map.edges);
    for (const id of step.defs)
      check(`${p}.defs`, "definition", id, map.definitions);
    check(`${p}.code`, "code", step.code, map.code);
  });
}
function scenarios(map: MapData, check: Check, errors: string[]) {
  map.scenarios.forEach((s, i) => {
    const p = `scenarios[${i}]`,
      ids = s.steps.map((t) => t.id);
    unique(ids, `${p}.steps`, "step", errors);
    steps(map, s, p, check);
    for (const id of Object.keys(s.nodeLabels ?? {}))
      check(`${p}.nodeLabels.${id}`, "node", id, map.nodes);
    s.flow?.forEach((h, j) => {
      check(`${p}.flow[${j}].node`, "node", h.node, map.nodes);
      check(`${p}.flow[${j}].edge`, "edge", h.edge, map.edges);
      check(`${p}.flow[${j}].step`, "step", h.step, ids);
    });
    s.repeatBadges?.forEach((b, j) => {
      check(`${p}.repeatBadges[${j}].edge`, "edge", b.edge, map.edges);
      check(`${p}.repeatBadges[${j}].step`, "step", b.step, ids);
    });
  });
}
function concepts(map: MapData, check: Check) {
  map.concepts.forEach((group, i) =>
    group.items.forEach((c, j) => {
      const p = `concepts[${i}].items[${j}]`;
      check(`${p}.definition`, "definition", c.definition, map.definitions);
      for (const id of c.nodes) check(`${p}.nodes`, "node", id, map.nodes);
      const scenario =
        c.step.scenario ?? map.conceptScenario ?? map.scenarios[0].id;
      check(
        `${p}.step.scenario`,
        "scenario",
        scenario,
        map.scenarios.map((s) => s.id),
      );
      const s = map.scenarios.find((s) => s.id === scenario);
      if (s)
        check(
          `${p}.step.step`,
          "step",
          c.step.step,
          s.steps.map((t) => t.id),
        );
    }),
  );
}
function hints(map: MapData, check: Check, errors: string[]) {
  const required = new Map<string, { side: string; path: string }>();
  map.layout?.hints.forEach((hint, i) => {
    const path = `layout.hints[${i}]`;
    if (hint.kind === "sameRank") {
      unique(hint.nodes, `${path}.nodes`, "node", errors, "");
      hint.nodes.forEach((id, j) =>
        check(`${path}.nodes[${j}]`, "node", id, map.nodes),
      );
    } else {
      check(`${path}.edge`, "edge", hint.edge, map.edges);
      if (hint.strength !== "required" || "viewBox" in map) return;
      const key = `${hint.edge}.${hint.end}`;
      const previous = required.get(key);
      if (previous && previous.side !== hint.side)
        errors.push(
          `Contradictory required sides: ${previous.path} and ${path} for ${key} (${previous.side}, ${hint.side})`,
        );
      else required.set(key, { side: hint.side, path });
    }
  });
}
/** Check every semantic reference before a layout engine sees a map. */
export function validateReferences(map: MapData): void {
  const errors: string[] = [];
  const check: Check = (path, kind, id, values) => {
    if (
      id !== undefined &&
      !(Array.isArray(values) ? values.includes(id) : Object.hasOwn(values, id))
    )
      errors.push(`${path}: unknown ${kind} “${id}”`);
  };
  const scenarioIds = map.scenarios.map((s) => s.id);
  unique(scenarioIds, "scenarios", "scenario", errors);
  check("conceptScenario", "scenario", map.conceptScenario, scenarioIds);
  for (const [id, n] of Object.entries(map.nodes))
    check(`nodes.${id}.lane`, "lane", n.lane, map.lanes);
  for (const [id, edge] of Object.entries(map.edges)) {
    check(`edges.${id}.from`, "node", edge.from, map.nodes);
    check(`edges.${id}.to`, "node", edge.to, map.nodes);
  }
  for (const [id, frame] of Object.entries(map.frames))
    for (const node of frame.showWith)
      check(`frames.${id}.showWith`, "node", node, map.nodes);
  for (const [id, nodes] of Object.entries(map.callouts))
    for (const node of nodes) check(`callouts.${id}`, "node", node, map.nodes);
  scenarios(map, check, errors);
  concepts(map, check);
  hints(map, check, errors);
  if (errors.length) throw new Error(errors.join("\n"));
}
