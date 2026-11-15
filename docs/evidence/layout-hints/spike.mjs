import fs from "node:fs";
import ELK from "elkjs/lib/elk.bundled.js";
import dagre from "@dagrejs/dagre";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
const W = 120,
  H = 44;
const elk = new ELK();
const gv = await Graphviz.load();
function intent(m) {
  // main path = edges of the first scenario in order; back edge = returns to a visited node
  const order = [];
  const seen = new Set();
  const main = [];
  const sc = m.scenarios[0];
  const hops = sc.flow
    ? sc.flow.map((h) => h.edge)
    : sc.steps.flatMap((s) => s.edges ?? []);
  for (const id of hops) {
    const e = m.edges[id];
    if (!e || main.includes(id)) continue;
    main.push(id);
    for (const n of [e.from, e.to])
      if (!seen.has(n)) {
        seen.add(n);
        order.push(n);
      }
  }
  for (const n of Object.keys(m.nodes)) if (!seen.has(n)) order.push(n);
  const rank = Object.fromEntries(order.map((n, i) => [n, i]));
  const back = Object.entries(m.edges)
    .filter(([, e]) => rank[e.to] <= rank[e.from])
    .map(([id]) => id);
  return { order, main, back };
}
function score(m, pos, it) {
  // share of forward main-path edges that advance along the axis; order of nodes on the axis
  const ax = m.direction === "right" ? 0 : 1;
  const fwd = it.main.filter((id) => !it.back.includes(id));
  const ok = fwd.filter(
    (id) => pos[m.edges[id].to][ax] > pos[m.edges[id].from][ax] + 1,
  ).length;
  const seq = Object.keys(pos).sort(
    (a, b) => pos[a][ax] - pos[b][ax] || pos[a][1 - ax] - pos[b][1 - ax],
  );
  const xs = Object.values(pos).map((p) => p[0]),
    ys = Object.values(pos).map((p) => p[1]);
  return `${ok}/${fwd.length} forward | ${seq.join(" → ")} | ${Math.round(Math.max(...xs) - Math.min(...xs) + W)}×${Math.round(Math.max(...ys) - Math.min(...ys) + H)}`;
}
async function runElk(m, it, hints) {
  const g = {
    id: "r",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": m.direction === "right" ? "RIGHT" : "DOWN",
      "elk.edgeRouting": "ORTHOGONAL",
      ...(hints
        ? {
            "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
            "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
            "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
          }
        : {}),
    },
    children: (hints ? it.order : Object.keys(m.nodes)).map((id) => ({
      id,
      width: W,
      height: H,
    })),
    edges: Object.entries(m.edges).map(([id, e]) => ({
      id,
      sources: [e.from],
      targets: [e.to],
    })),
  };
  const r = await elk.layout(g);
  return Object.fromEntries(r.children.map((c) => [c.id, [c.x, c.y]]));
}
function runDagre(m, it, hints) {
  const g = new dagre.graphlib.Graph({ multigraph: true })
    .setGraph({ rankdir: m.direction === "right" ? "LR" : "TB" })
    .setDefaultEdgeLabel(() => ({}));
  for (const id of hints ? it.order : Object.keys(m.nodes))
    g.setNode(id, { width: W, height: H });
  for (const [id, e] of Object.entries(m.edges)) {
    const b = hints && it.back.includes(id) && e.from !== e.to;
    g.setEdge(
      b ? e.to : e.from,
      b ? e.from : e.to,
      { weight: hints && it.main.includes(id) && !b ? 5 : 1, minlen: 1 },
      id,
    );
  }
  dagre.layout(g);
  return Object.fromEntries(
    g.nodes().map((n) => [n, [g.node(n).x, g.node(n).y]]),
  );
}
function runDot(m, it, hints) {
  let s = `digraph{rankdir=${m.direction === "right" ? "LR" : "TB"};node[shape=box,fixedsize=true,width=${W / 72},height=${H / 72}];${hints ? "ordering=out;" : ""}`;
  for (const id of hints ? it.order : Object.keys(m.nodes)) s += `"${id}";`;
  for (const [id, e] of Object.entries(m.edges))
    s += `"${e.from}"->"${e.to}"[${hints && it.back.includes(id) ? "constraint=false," : ""}${hints && it.main.includes(id) && !it.back.includes(id) ? "weight=5," : ""}label="${id}"];`;
  const j = JSON.parse(gv.layout(s + "}", "json", "dot"));
  return Object.fromEntries(
    j.objects
      .filter((o) => o.pos)
      .map((o) => {
        const [x, y] = o.pos.split(",").map(Number);
        return [o.name, [x, -y]];
      }),
  );
}
for (const ex of ["coffee", "door", "gcd"]) {
  const m = JSON.parse(
    fs.readFileSync(`/home/claude/concept-map/examples/${ex}/map.json`, "utf8"),
  );
  const it = intent(m);
  console.log(
    `\n== ${ex} (${m.direction ?? "down"}) main: ${it.main.join(",")} | back: ${it.back.join(",")}`,
  );
  for (const [name, f] of [
    ["elk", runElk],
    ["dagre", runDagre],
    ["dot", runDot],
  ])
    for (const h of [false, true])
      console.log(
        `${name.padEnd(5)} ${h ? "hints" : "plain"}: ${score(m, await f(m, it, h), it)}`,
      );
}
