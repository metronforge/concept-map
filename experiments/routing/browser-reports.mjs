import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { format } from "prettier";
import { hash } from "./metrics.mjs";

export function summarize(states) {
  const allContacts = states.flatMap((s) => Object.values(s.contacts).flat());
  return {
    states: states.map((s) => ({
      scenario: s.scenario,
      step: s.step,
      presentation: s.presentation,
      hard: s.hard,
      tight: Object.values(s.contacts)
        .flat()
        .filter((c) => c.band === "tight").length,
    })),
    defects: [
      ...new Set(
        allContacts
          .filter((c) => c.band === "defect")
          .map((c) => `${c.a} / ${c.b}`),
      ),
    ],
    text: {
      pageFont: states[0].text.pageFont,
      minimum: Math.min(...states.map((s) => s.text.minimum)),
      maximum: Math.max(...states.map((s) => s.text.maximum)),
      statesBelowPage: states.filter((s) => s.text.belowPage > 0).length,
      statesAboveLimit: states.filter((s) => s.text.aboveLimit > 0).length,
    },
    maximumOverflow: Math.max(...states.map((s) => s.text.overflow)),
    statesNotFitting: states.filter((s) => !s.text.fits).length,
  };
}

export async function report(directory, mode, path, data) {
  const file = join(directory, "browser", path);
  const stored = JSON.parse(JSON.stringify(data));
  if (mode === "--check") {
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), stored, file);
    return;
  }
  const json = await format(JSON.stringify(stored), { parser: "json" });
  assert.ok(json.trimEnd().split("\n").length <= 200, `${file}: too long`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, json);
}

/** Indexed parts preserve order without producing oversized book reports. */
export async function reportParts(directory, mode, path, values) {
  const files = [];
  for (let start = 0; start < values.length; start += 10) {
    const file = `${path}/${String(start / 10).padStart(3, "0")}.json`;
    await report(directory, mode, file, values.slice(start, start + 10));
    files.push(file);
  }
  return files;
}

export async function bookReports(directory, mode, path, data, quality) {
  const { states, defects, ...summary } = data;
  const parts = {};
  for (const [name, values] of Object.entries({ states, defects }))
    parts[name] = await reportParts(directory, mode, `${path}/${name}`, values);
  const { labels, steps, lines, ...rest } = quality;
  for (const [group, lists] of Object.entries({ labels, steps, lines }))
    for (const [kind, values] of Object.entries(lists))
      parts[`${group}-${kind}`] = await reportParts(
        directory,
        mode,
        `${path}/${group}-${kind}`,
        values,
      );
  await report(directory, mode, `${path}/quality.json`, rest);
  await report(directory, mode, `${path}/summary.json`, {
    ...summary,
    stateCount: states.length,
    parts,
  });
}

export function evidence(item, result, browser, version, width, candidate) {
  assert.equal(result.fontsLoaded, true, `${item.id}: pinned fonts loaded`);
  assert.equal(result.geometryPreserved, true, `${item.id}: fixed geometry`);
  assert.equal(result.measurement, "dom", `${item.id}: real-font refinement`);
  assert.equal(
    result.states.length,
    item.resolved.scenarios.reduce((n, s) => n + s.steps.length + 1, 0),
  );
  for (const state of result.states) assert.deepEqual(state.mismatches, []);
  return {
    id: item.id,
    candidate,
    browser,
    browserVersion: version,
    width,
    inputSha256: hash(JSON.stringify(item.resolved)),
    drawnSha256: hash(JSON.stringify(result.drawn)),
    fixedGeometryPreserved: result.geometryPreserved,
    measurement: result.measurement,
    ...summarize(result.states),
  };
}
