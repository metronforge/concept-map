import { domMeasurer } from "../../dist/dom/measureLabel.js";
import { derive } from "../../dist/model/frame.js";
import { contactInputs } from "../../dist/layout/stages/contact-inputs.js";
import {
  labelContacts,
  lineContacts,
  stepContacts,
} from "../../dist/layout/stages/contacts.js";
import { contactLists } from "../../dist/layout/stages/hard-check.js";

const point = (circle) => [
  Number(circle.getAttribute("cx")),
  Number(circle.getAttribute("cy")),
];
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const visible = (element) =>
  getComputedStyle(element).visibility !== "hidden" &&
  getComputedStyle(element).display !== "none";

function nodeBadgeCount({ map, state }) {
  const scenario = map.scenarios[state.scenario];
  if (!scenario.display.nodeBadges) return 0;
  const upto = state.mode === "all" ? scenario.steps.length : state.step + 1;
  return scenario.steps
    .slice(0, upto)
    .filter((step) => !step.edges.length && step.current.length).length;
}

/** Keep ghost shapes: they are faint, but still painted. Use actual step circles. */
export function stateContacts(player) {
  const { shapes, judge } = contactInputs(player.map, player.map, {
    measureLabel: domMeasurer(player.root),
  });
  const labels = [...player.root.querySelectorAll(".etext")].filter(visible);
  shapes.labels = shapes.labels.filter((s) =>
    labels.some((el) => el.dataset.edge === s.id),
  );
  const circles = [...player.root.querySelectorAll(".badge circle")].filter(
    visible,
  );
  const steps = [],
    nodeSteps = [];
  const firstNode = circles.length - nodeBadgeCount(player);
  circles.forEach((circle, i) => {
    const at = point(circle);
    const node =
      i >= firstNode && shapes.nodeSteps.find((s) => equal(s.at, at));
    const edge = shapes.steps.find((s) => equal(s.at, at));
    (node ? nodeSteps : steps).push({
      id: node?.id ?? edge?.id ?? `dom-step:${i}`,
      at,
    });
  });
  Object.assign(shapes, { steps, nodeSteps });
  const report = {
    labels: labelContacts(shapes, judge),
    steps: stepContacts(shapes, judge),
    lines: lineContacts(shapes, judge),
  };
  return Object.fromEntries(contactLists(report));
}

export function mismatches(player) {
  const { root, map } = player;
  const expected = derive(map, player.state).badges.map((b) => [b.x, b.y]);
  const actual = [...root.querySelectorAll(".badge circle")].map(point);
  const errors = equal(actual, expected) ? [] : ["badges"];
  for (const el of root.querySelectorAll(".etext"))
    if (
      !equal(
        [+el.getAttribute("x"), +el.getAttribute("y")],
        map.edges[el.dataset.edge].label.at,
      )
    )
      errors.push(`label:${el.dataset.edge}`);
  for (const el of root.querySelectorAll(".edge path"))
    if (el.getAttribute("d") !== map.edges[el.parentElement.dataset.edge].path)
      errors.push(`path:${el.parentElement.dataset.edge}`);
  for (const el of root.querySelectorAll(".node rect")) {
    const id = el.parentElement.dataset.node;
    const box = ["x", "y", "width", "height"].map(
      (key) => +el.getAttribute(key),
    );
    if (!equal(box, map.nodes[id].box)) errors.push(`node:${id}`);
  }
  return errors;
}

export function textSizes(root) {
  const svg = root.querySelector(".map svg");
  const scale = svg.getScreenCTM().a;
  const pageFont = parseFloat(getComputedStyle(root).fontSize);
  const sizes = [...svg.querySelectorAll(".node text:not(.tag), .etext")]
    .filter(visible)
    .map((el) => parseFloat(getComputedStyle(el).fontSize) * scale);
  return {
    pageFont,
    minimum: Math.min(...sizes),
    maximum: Math.max(...sizes),
    belowPage: sizes.filter((s) => s < pageFont).length,
    aboveLimit: sizes.filter((s) => s > pageFont * 1.25).length,
    overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    fits: svg.getBoundingClientRect().width <= root.clientWidth,
  };
}
