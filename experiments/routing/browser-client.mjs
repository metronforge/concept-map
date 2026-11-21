import { mount } from "../../dist/dom/index.js";
import { check } from "../../dist/layout/index.js";
import { domMeasurer } from "../../dist/dom/measureLabel.js";
import {
  stateContacts,
  mismatches,
  textSizes,
  visible,
} from "./browser-state.mjs";

const geometry = (map) =>
  JSON.stringify([
    map.nodes,
    map.lanes,
    map.frames,
    map.viewBox,
    Object.values(map.edges).map((edge) => edge.path),
  ]);

async function settle() {
  await document.fonts.ready;
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
}

function readState(player, scenario, step) {
  const contacts = stateContacts(player);
  return {
    scenario,
    step,
    presentation: visible(player.root.querySelector("[data-map-edge-labels]"))
      ? "drawing"
      : "panel",
    hard: Object.values(contacts)
      .flat()
      .filter((c) => c.band === "defect").length,
    contacts,
    text: textSizes(player.root),
    mismatches: mismatches(player),
  };
}

async function states(player) {
  const results = [];
  for (const [index, scenario] of player.map.scenarios.entries()) {
    player.dispatch({ type: "mode", mode: "step" });
    player.dispatch({ type: "scenario", index });
    for (const step of [...scenario.steps.keys(), "all"]) {
      player.dispatch(
        step === "all" ? { type: "mode", mode: "all" } : { type: "go", step },
      );
      await settle();
      results.push(
        readState(
          player,
          scenario.id,
          step === "all" ? "all" : scenario.steps[step].id,
        ),
      );
    }
  }
  return results;
}

/** Mount fixed boxes and routes: no narrow layout callback may replace them. */
export async function measure({ source, resolved }) {
  document.body.replaceChildren();
  const host = document.createElement("main");
  document.body.append(host);
  const player = mount(host, resolved, { reducedMotion: true });
  try {
    await settle();
    const results = await states(player);
    return {
      fontsLoaded:
        document.fonts.check("16px RoutingSans") &&
        document.fonts.check("16px RoutingMono"),
      geometryPreserved: geometry(resolved) === geometry(player.map),
      measurement: player.map.measurement?.name,
      quality: check(source, player.map, {
        measureLabel: domMeasurer(player.root),
      }),
      drawn: player.map,
      states: results,
    };
  } finally {
    player.destroy();
  }
}

/** A harness regression: actual moved badge circles must not escape the audit. */
export async function probe(map) {
  document.body.replaceChildren();
  const player = mount(document.body, map, { reducedMotion: true });
  try {
    await settle();
    player.dispatch({ type: "mode", mode: "all" });
    const label = player.root.querySelector(".etext");
    const box = label.getBBox();
    const circle = player.root.querySelector(".badge circle");
    circle.setAttribute("cx", box.x + box.width / 2);
    circle.setAttribute("cy", box.y + box.height / 2);
    const contacts = stateContacts(player);
    return {
      mismatch: mismatches(player).includes("badges"),
      defect: contacts["a step number covers an arrow label"].some(
        (c) => c.band === "defect",
      ),
    };
  } finally {
    player.destroy();
  }
}
