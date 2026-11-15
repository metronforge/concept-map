import { readFileSync } from "node:fs";
import { renderSvg, derive, escapeHtml as esc } from "../../dist/index.js";
const names = { manual: "Ручная", dagre: "dagre", elk: "ELK" };
const num = (value) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
export function graphSvg(map, markerId, standalone = false) {
  const frame = derive(map, { scenario: 0, step: 0, mode: "all" });
  for (const field of ["nodes", "edges", "lanes", "frames", "edgeLabels"])
    for (const [id, value] of Object.entries(frame[field])) {
      value.revealed = true;
      if ("current" in value) value.current = false;
      if (field === "nodes") value.label = map.nodes[id].label;
    }
  frame.badges = [];
  const svg = renderSvg(map, { frame, markerId });
  if (!standalone) return svg;
  const style =
    readFileSync("css/concept-map.css", "utf8") +
    "\n@font-face{font-family:ComparisonSans;src:url(../fonts/DejaVuSans.ttf)}@font-face{font-family:ComparisonMono;src:url(../fonts/DejaVuSansMono.ttf)}.map-ui{--cmap-font-sans:ComparisonSans;--cmap-font-mono:ComparisonMono}";
  return svg
    .replace(
      "<svg ",
      `<svg xmlns="http://www.w3.org/2000/svg" class="map-ui" width="${map.viewBox[0]}" height="${map.viewBox[1]}" `,
    )
    .replace("<defs>", `<style>${style}</style><defs>`);
}
function cells(entry, name, bundles) {
  const { metrics: m, timing: t } = entry.variants[name];
  return `<td>${m.crossings}</td><td>${m.bends}</td><td>${num(m.area)}<small>${num(m.width)} × ${num(m.height)}</small></td><td>${t ? `<span title="Мин–макс: ${num(t.min)}–${num(t.max)} мс">${num(t.median)} мс</span>` : "—"}</td>${bundles ? `<td>${name === "manual" ? "—" : `${num(bundles[name].gzip / 1024)} KiB`}</td>` : ""}`;
}
function mapSection(entry, variants) {
  return `<section class="comparison" id="map-${esc(entry.id)}" data-map="${esc(entry.id)}">
    <header class="map-heading"><div><span class="eyebrow">${entry.id === "coffee" ? "ПРИМЕР" : `КНИГА · ${esc(entry.id)}`}</span><h2>${esc(entry.title)}</h2></div><a href="#summary">↑ Метрики</a></header>
    ${entry.note ? `<p class="note">${esc(entry.note)}</p>` : ""}
    ${entry.observations?.length ? `<p class="note">Наложение подписей: ${entry.observations.map((o) => `${names[o.engine]} — одинаковая точка у ${o.edges.length} подписей (${o.edges.map(esc).join(", ")})`).join("; ")}. Это результат текущего адаптера, не исправленный в сравнении; площадь и число пересечений не учитывают читаемость текста.</p>` : ""}
    <div class="controls"><label>Сценарий <select data-scenario><option value="all">Все узлы и рёбра</option>${entry.scenarios.map((s, i) => `<option value="${i}">${esc(s.label)}</option>`).join("")}</select></label><label>Шаг <select data-step disabled><option value="all">Все шаги</option></select></label><a href="data/${entry.id}-source.json">Исходная карта без геометрии ↗</a></div>
    <p class="step-description" aria-live="polite">Нейтральный обзор всех узлов и рёбер; без нумерации шагов.</p>
    <div class="triptych">${Object.entries(names)
      .map(([name, title]) => {
        const map = variants[name],
          m = entry.variants[name].metrics;
        return `<article class="variant" data-variant="${name}"><header><h3>${title}</h3><div><button type="button" data-zoom aria-pressed="false" aria-label="Масштаб 1:1: ${title}, ${esc(entry.id)}">1:1</button><a href="svg/${entry.id}-${name}.svg" target="_blank" rel="noopener" aria-label="Открыть SVG: ${title}, ${esc(entry.id)}">SVG ↗</a></div></header><div class="canvas map-ui" tabindex="0" aria-label="${title}: прокрутка схемы" style="--native-width:${map.viewBox[0]}px;--native-height:${map.viewBox[1]}px">${graphSvg(map, `${entry.id}-${name}`)}</div><footer><span>${m.crossings} пересеч. · ${m.bends} изломов</span><a href="data/${entry.id}-${name}.json">JSON</a></footer></article>`;
      })
      .join("")}</div>
    <div class="table-wrap"><table class="local-metrics"><caption>Полная карта; метрики не меняются при выборе сценария</caption><thead><tr><th>Вариант</th><th>Пересечения</th><th>Изломы</th><th>Площадь, ед.²</th><th>Время раскладки</th></tr></thead><tbody>${Object.keys(
      names,
    )
      .map((name) => `<tr><th>${names[name]}</th>${cells(entry, name)}</tr>`)
      .join("")}</tbody></table></div>
  </section>`;
}
function document(report) {
  return `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Ручная · dagre · ELK — сравнение раскладок</title><link rel="icon" href="data:,"><link rel="stylesheet" href="concept-map.css"><link rel="stylesheet" href="page.css"><script src="client.js" type="module"></script></head><body>
  <header class="hero"><span class="eyebrow">CONCEPT MAP · 0.2.0 / ПУНКТ 4</span><h1>Одна карта.<br>Три раскладки.</h1><p class="lead">23 карты книги и кофейня: ручная геометрия рядом с dagre и ELK. Основной движок выбирает автор по этим схемам — в коде выбор не сделан.</p><div class="hero-links"><a href="#map-coffee">Начать с кофейни ↓</a><a href="#summary">Сравнить метрики ↓</a><a href="metrics.json">Данные замеров JSON ↗</a></div><p class="provenance">${esc(report.revision.slice(0, 12))}${report.dirty ? " · рабочая копия" : ""} · ${esc(report.generatedAt)} · dagre ${esc(report.versions.dagre)} / ELK ${esc(report.versions.elk)}</p></header>
  <main><aside class="note">Карта 2.1 показана без стрелки к рамке <code>timeout_outer</code> во всех трёх вариантах. Ручная кофейня — новый независимый эталон. Полосы, размеры подписей и маршруты соответствуют текущим адаптерам; исправления качества здесь не внесены.</aside>
  <nav class="map-nav" aria-label="Карты">${report.maps.map((m) => `<a href="#map-${m.id}">${m.id === "coffee" ? "Кофейня" : m.id}</a>`).join("")}</nav>
  <section id="method"><h2>Как читать сравнение</h2><div class="method-grid"><p><b>Одинаковый вход.</b> Автоматические версии получены только из исходных карт без viewBox, координат, путей и точек подписей. Ручная геометрия сохранена отдельно. Все схемы используют один шрифт DejaVu.</p><p><b>Масштаб.</b> По умолчанию каждая схема целиком вписана в одинаковое окно. Для чтения деталей нажмите 1:1 или откройте SVG. Вписанные схемы не имеют общего масштаба; сравнивайте площадь по числам.</p><p><b>Пересечения и изломы.</b> Считаются точки поперечного пересечения разных рёбер, по паре рёбер; стыки, касания, наложения и самопересечения исключены. Излом — смена направления полилинии, включая разворот. Перекрытия узлов и подписей оцените визуально.</p><p><b>Площадь и время.</b> Площадь — ширина × высота viewBox с полями. Время — медиана 5 полных layout() после одного прогрева для каждой карты и движка. Импорт движка, SVG и запись файлов исключены. Ручное время неизвестно, а не равно нулю.</p></div>
  <details><summary>Среда, бандлы и ограничения</summary><p>${esc(report.environment.node)} · ${esc(report.environment.platform)} ${esc(report.environment.arch)} · ${esc(report.environment.cpu ?? "")}. Все прогоны последовательны; порядок движков чередуется по картам. Полные выборки времени и хеш lockfile доступны в JSON.</p><p>Бандл: самостоятельный браузерный ESM с layout(), адаптером, движком и Zod, minify + gzip level 9, без external-зависимостей. Не включает CSS, шрифты, карту и плеер. Это стоимость выполнения раскладки в браузере, не размер этой страницы: здесь показаны готовые SVG, движки не загружаются.</p><p>dagre: ${num(report.bundles.dagre.gzip / 1024)} KiB gzip (${num(report.bundles.dagre.raw / 1024)} KiB raw). ELK: ${num(report.bundles.elk.gzip / 1024)} KiB gzip (${num(report.bundles.elk.raw / 1024)} KiB raw). Размер одинаков для всех карт; прочерк у ручной версии означает «не применяется».</p><p>ELK использует нативные полосы. dagre размещает группы по полосам после раскладки и перестраивает межполосные рёбра. Рамки исходных карт строятся по showWith — это триггеры видимости, не полное описание вложенности. Отсюда возможны отличия от ручных рамок (ADR 0014/0016). Нет суммарного рейтинга и автоматического выбора победителя.</p></details></section>
  <section id="summary"><h2>Все метрики</h2><div class="table-wrap"><table><caption>24 карты × 3 варианта. KiB = 1024 байта.</caption><thead><tr><th>Карта</th><th>Вариант</th><th>Пересечения</th><th>Изломы</th><th>Площадь, ед.²</th><th>Медиана layout()</th><th>Бандл + движок, gzip</th></tr></thead><tbody>${report.maps
    .map((m) =>
      Object.keys(names)
        .map(
          (name) =>
            `<tr><th><a href="#map-${m.id}">${m.id === "coffee" ? "Кофейня" : m.id}</a></th><td>${names[name]}</td>${cells(m, name, report.bundles)}</tr>`,
        )
        .join(""),
    )
    .join("")}</tbody></table></div></section>
  ${report.maps.map((m) => m.html).join("\n")}</main><footer class="site-footer">Решение за автором. <a href="https://github.com/metronforge/concept-map">Исходный код и ADR ↗</a> · <a href="fonts/LICENSE.txt">Лицензия DejaVu</a></footer></body></html>`;
}
export const page = { mapSection, document };
