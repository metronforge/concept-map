/** A small authored map: valid references, forward and reverse hops, two steps. */
export function authoredFixture() {
  return {
    format: 2 as const,
    spread: "2.1",
    title: "Fixture map",
    viewBox: [200, 200],
    lanes: { client: { label: "Client", layer: "client", y: 0, h: 200 } },
    nodes: {
      a: { label: "A", layer: "client", lane: "client", box: [10, 10, 50, 30] },
      b: {
        label: "B",
        layer: "server",
        lane: "client",
        box: [10, 100, 50, 30],
      },
    },
    frames: {
      outer: { label: "Frame", box: [0, 0, 100, 180], showWith: ["a"] },
    },
    edges: { ab: { from: "a", to: "b", path: "M35 40 V100", badge: [35, 70] } },
    definitions: { call: { term: "Call", text: "A call" } },
    code: { call: { title: "Source", lines: ["await call()"] } },
    scenarios: [
      {
        id: "normal",
        label: "Normal",
        steps: [
          {
            id: "start",
            title: "Start",
            text: "Start here",
            show: ["a"],
            current: ["a"],
            edges: [],
            defs: ["call"],
            code: "call",
            sources: [{ file: "a.ts", lines: [1, 2] }],
            deeper: ["2.2"],
          },
          {
            id: "end",
            title: "End",
            text: "End here",
            show: ["b"],
            current: ["b"],
            edges: ["ab"],
            defs: [],
            sources: [{ file: "a.ts", lines: [3, 4] }],
            deeper: ["2.2"],
          },
        ],
        flow: [
          { node: "a", step: "start", log: [] },
          { edge: "ab", node: "b", step: "end", log: ["done"] },
        ],
        repeatBadges: [{ edge: "ab", step: "end", at: [40, 80] }],
      },
    ],
    conceptScenario: "normal",
    concepts: [
      {
        label: "Concepts",
        layer: "client",
        items: [
          {
            definition: "call",
            short: "call",
            nodes: ["a"],
            step: { step: "start" },
            source: { file: "a.ts", lines: [1, 2] },
          },
        ],
      },
    ],
    callouts: { "1": ["a"] },
    deeper: [{ spread: "2.2", why: "Learn more" }],
  };
}
