import { derive } from "../../dist/index.js";
import { renderBadges } from "../../dist/render/svg.js";
for (const section of document.querySelectorAll("[data-map]")) {
  const scenario = section.querySelector("[data-scenario]");
  const step = section.querySelector("[data-step]");
  let loading;
  const load = () =>
    (loading ??= Promise.all(
      ["manual", "dagre", "elk"].map(async (name) => {
        const response = await fetch(
          `data/${section.dataset.map}-${name}.json`,
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return [name, await response.json()];
      }),
    ).then(Object.fromEntries));
  async function update() {
    try {
      const maps = await load(),
        map = maps.manual,
        neutral = scenario.value === "all";
      const state = {
        scenario: neutral ? 0 : Number(scenario.value),
        step: step.value === "all" ? 0 : Number(step.value),
        mode: step.value === "all" ? "all" : "step",
      };
      for (const variant of section.querySelectorAll("[data-variant]")) {
        const frame = derive(maps[variant.dataset.variant], state);
        variant.querySelector("[data-map-badges]").innerHTML = neutral
          ? ""
          : renderBadges(frame.badges);
        for (const [field, selector, attr] of [
          ["nodes", ".node[data-node]", "node"],
          ["edges", ".edge[data-edge]", "edge"],
          ["edgeLabels", ".etext[data-edge]", "edge"],
          ["lanes", ".lane[data-lane]", "lane"],
          ["frames", ".frame[data-frame]", "frame"],
        ])
          for (const element of variant.querySelectorAll(selector)) {
            const id = element.dataset[attr],
              value = frame[field][id];
            element.classList.toggle("ghost", !neutral && !value.revealed);
            element.classList.toggle("cur", !neutral && !!value.current);
            if (field === "nodes")
              element.querySelector("text").textContent = neutral
                ? map.nodes[id].label
                : value.label;
          }
      }
      section.querySelector(".step-description").textContent = neutral
        ? "Нейтральный обзор всех узлов и рёбер; без нумерации шагов."
        : step.value === "all"
          ? `Сценарий «${map.scenarios[Number(scenario.value)].label}»: все шаги. Неиспользованные элементы приглушены.`
          : map.scenarios[Number(scenario.value)].steps[Number(step.value)]
              .title;
    } catch (error) {
      section.querySelector(".step-description").textContent =
        `Не удалось загрузить данные сценария: ${error.message}`;
    }
  }
  scenario.addEventListener("change", async () => {
    try {
      const map = (await load()).manual;
      step.replaceChildren(new Option("Все шаги", "all"));
      step.disabled = scenario.value === "all";
      if (!step.disabled)
        map.scenarios[Number(scenario.value)].steps.forEach((s, i) =>
          step.add(new Option(`${i + 1}. ${s.title}`, String(i))),
        );
      await update();
    } catch (error) {
      section.querySelector(".step-description").textContent =
        `Ошибка загрузки: ${error.message}`;
    }
  });
  step.addEventListener("change", update);
  for (const button of section.querySelectorAll("[data-zoom]"))
    button.addEventListener("click", () => {
      const native = button.closest(".variant").classList.toggle("native");
      button.setAttribute("aria-pressed", String(native));
      button.textContent = native ? "Вписать" : "1:1";
    });
}
