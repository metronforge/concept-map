import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { ResolvedMapSchema } from "../../src/schema";
import { compareAuthored } from "./authored-label-geometry";

const maps = JSON.parse(readFileSync("test/fixtures/book-maps.json", "utf8"));
for (const width of [1280, 390])
  test(`clear authored labels retain their rendered centres at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("/integration/");
    await page.addStyleTag({ path: "css/concept-map.css" });
    const results = [];
    for (const entry of maps) {
      const map = ResolvedMapSchema.parse(entry.map);
      results.push({ id: entry.id, ...(await compareAuthored(page, map)) });
    }
    if (process.env.AUTHORED_EVIDENCE_DIR) {
      mkdirSync(process.env.AUTHORED_EVIDENCE_DIR, { recursive: true });
      writeFileSync(
        `${process.env.AUTHORED_EVIDENCE_DIR}/${info.project.name}-${width}.json`,
        JSON.stringify(results, null, 2) + "\n",
      );
    }
    expect(results.reduce((sum, row) => sum + row.clear, 0)).toBeGreaterThan(0);
    expect(results.filter((row) => row.shifted.length)).toEqual([]);
  });
