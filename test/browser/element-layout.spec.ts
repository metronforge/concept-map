import { test, expect } from "@playwright/test";
const entry = "/assets/integration.js";
const source = {
  format: 3,
  id: "queue",
  title: "Queue",
  direction: "right",
  layers: { service: { label: "Service" } },
  nodes: {
    guest: { label: "Guest", layer: "service" },
    staff: { label: "Staff", layer: "service" },
  },
  edges: { order: { from: "guest", to: "staff", label: "Order" } },
  scenarios: [
    {
      id: "normal",
      label: "Normal",
      steps: [
        {
          id: "order",
          title: "Order",
          text: "Order coffee",
          show: ["guest", "staff"],
          edges: ["order"],
        },
      ],
    },
  ],
};
for (const engine of ["dagre", "elk"]) {
  test(`only ${engine} loads for a source map`, async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.goto("/integration/");
    const result = await page.evaluate(
      async ({ entry, source, engine }) => {
        const { ConceptMapElement } = await import(entry);
        const el = new ConceptMapElement();
        el.map = source;
        el.setAttribute("layout", engine);
        document.body.append(el);
        await el.ready;
        return {
          nodes: Object.keys(el.player.map.nodes),
          path: el.player.map.edges.order.path,
        };
      },
      { entry, source, engine },
    );
    expect(result.nodes).toEqual(["guest", "staff"]);
    expect(result.path).toMatch(/^M/);
    expect(
      requests.some((url) => new RegExp(`/assets/${engine}-`).test(url)),
    ).toBe(true);
    const other = engine === "dagre" ? "elk" : "dagre";
    expect(
      requests.some((url) => new RegExp(`/assets/${other}-`).test(url)),
    ).toBe(false);
  });
}

test("ready maps and layout callbacks download no engine", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/integration/");
  await page.evaluate(
    async ({ entry, source }) => {
      const map = JSON.parse(
        document.querySelector("#server script")!.textContent!,
      );
      const { ConceptMapElement } = await import(entry);
      for (const engine of ["dagre", "elk", "invalid"]) {
        const el = new ConceptMapElement();
        el.map = map;
        el.setAttribute("layout", engine);
        document.body.append(el);
        await el.ready;
      }
      const custom = new ConceptMapElement();
      custom.map = source;
      custom.layout = async () => map;
      custom.setAttribute("layout", "elk");
      document.body.append(custom);
      await custom.ready;
    },
    { entry, source },
  );
  expect(
    requests.filter((url) => /\/assets\/(dagre|elk|layout)-/.test(url)),
  ).toEqual([]);
});

test("changing layout retries the original inline source, including after reconnect", async ({
  page,
}) => {
  await page.goto("/integration/");
  const result = await page.evaluate(
    async ({ entry, source }) => {
      const { ConceptMapElement } = await import(entry);
      const el = new ConceptMapElement();
      const script = document.createElement("script");
      script.type = "application/json";
      script.textContent = JSON.stringify(source);
      el.append(script);
      document.body.append(el);
      const missing = await el.ready.catch((e: Error) => e.message);
      el.setAttribute("layout", "dagre");
      await el.ready;
      const first = el.player.map.edges.order.path;
      el.setAttribute("layout", "elk");
      await el.ready;
      const second = el.player.map.edges.order.path;
      el.remove();
      el.setAttribute("layout", "invalid");
      document.body.append(el);
      const invalid = await el.ready.catch((e: Error) => e.message);
      el.removeAttribute("layout");
      const cleared = await el.ready.catch((e: Error) => e.message);
      return { missing, first, second, invalid, cleared };
    },
    { entry, source },
  );
  expect(result.missing).toContain("Source map needs layout");
  expect(result.first).not.toBe(result.second);
  expect(result.invalid).toContain('Unknown layout "invalid"');
  expect(result.cleared).toBe(result.missing);
});
