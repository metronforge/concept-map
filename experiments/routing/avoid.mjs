import { AvoidLib } from "libavoid-js";

let loading;
export async function loadAvoid() {
  loading ??= AvoidLib.load();
  await loading;
  return AvoidLib.getInstance();
}

function endpoint(avoid, terminal) {
  const flags = avoid.ConnDirFlag;
  const sides = {
    top: flags.ConnDirUp,
    right: flags.ConnDirRight,
    bottom: flags.ConnDirDown,
    left: flags.ConnDirLeft,
  };
  const [x, y] = terminal.point;
  return {
    x,
    y,
    directions: terminal.sides.reduce((n, side) => n | sides[side], 0),
  };
}

/** Experimental fixed-point terminals retain gaps and frame endpoint identity. */
export function routeAvoid(avoid, problem) {
  const router = new avoid.Router(avoid.RouterFlag.OrthogonalRouting);
  try {
    // Enclose the two-unit ports without closing the six-unit corridor.
    router.setRoutingParameter(avoid.RoutingParameter.shapeBufferDistance, 2.5);
    for (const {
      box: [x, y, width, height],
    } of problem.nodes)
      router.addShape({ x, y, width, height });
    const connections = problem.edges.map((edge) =>
      router.addConnector(endpoint(avoid, edge.from), endpoint(avoid, edge.to)),
    );
    router.processTransaction();
    return connections.map((connection, i) => ({
      id: problem.edges[i].id,
      points: connection.displayRoute().map(({ x, y }) => [x, y]),
      ...(!connection.hasValidRoute()
        ? { failure: "libavoid found no route" }
        : {}),
    }));
  } finally {
    router.delete();
  }
}
