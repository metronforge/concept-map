export const variants = {
  manual: { title: "Hand layout · unchanged" },
  dagre: { title: "dagre · with intent", engine: "dagre", intent: true },
  "dagre-plain": {
    title: "dagre · without intent",
    engine: "dagre",
    intent: false,
  },
  elk: { title: "ELK · with intent", engine: "elk", intent: true },
  "elk-plain": { title: "ELK · without intent", engine: "elk", intent: false },
};
