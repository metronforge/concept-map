import { gzipSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import cases from "../.size-limit.js";

// Measurement only: external references make these bundles non-runnable.
// The difference includes dependencies dropped by tree shaking, not just
// a module's own code. It is not a saving achievable without behavior changes.
const { build, version } = await import(
  pathToFileURL(process.env.ESBUILD_PATH).href
);
if (version !== "0.28.0") throw new Error("Use esbuild 0.28.0 for this audit");
if (!process.argv[2])
  throw new Error("Pass an output directory outside the repo");
const directory = resolve(process.argv[2]);
const root = resolve(".");
mkdirSync(directory, { recursive: true });
const groups = {
  "narrow fitting and cache": ["dom/refine#fitCandidates", "dom/narrowLayout"],
  "dom/refine": ["dom/refine"],
  "dom/narrowLayout": ["dom/narrowLayout"],
  "dom/resize": ["dom/resize"],
  "layout/stages/presentation": ["layout/stages/presentation"],
  "layout/stages/hard-check": ["layout/stages/hard-check"],
  "layout/stages/hints": ["layout/stages/hints"],
  "layout/hints": ["layout/hints"],
  "hint modules together": ["layout/stages/hints", "layout/hints"],
};

function downloadSize(outputs, entry) {
  const seen = new Set();
  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    for (const dependency of outputs[file].imports)
      if (dependency.kind !== "dynamic-import" && !dependency.external)
        visit(dependency.path);
  }
  visit(entry);
  return [...seen].reduce(
    (sum, file) =>
      sum + gzipSync(readFileSync(resolve(file)), { level: 9 }).length,
    0,
  );
}

function omitModules(modules) {
  const paths = new Map(
    modules
      .filter((name) => !name.includes("#"))
      .map((name) => [resolve("dist", `${name}.js`), name]),
  );
  return {
    name: "measure-omitted-modules",
    setup(builder) {
      if (modules.includes("dom/refine#fitCandidates"))
        builder.onLoad({ filter: /\/dist\/dom\/refine\.js$/ }, (args) => {
          const original = readFileSync(args.path, "utf8");
          const contents = original.replace(
            /function fitCandidates\([\s\S]*?\n}/,
            "function fitCandidates() {}",
          );
          if (contents === original)
            throw new Error("Missing fitCandidates body");
          return { contents, loader: "js" };
        });
      builder.onResolve({ filter: /^\./ }, (args) => {
        const name = paths.get(resolve(args.resolveDir, args.path));
        if (name) return { path: `audit:${name}`, external: true };
      });
    },
  };
}

async function measure(scenario, modules, outdir) {
  const selection = scenario.import?.[scenario.path] ?? "*";
  const result = await build({
    stdin: {
      contents: `export ${selection} from './${scenario.path}';`,
      resolveDir: root,
      sourcefile: "consumer.js",
    },
    absWorkingDir: root,
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    metafile: true,
    outdir,
    plugins: [omitModules(modules)],
  });
  const outputs = result.metafile.outputs;
  const entry = Object.keys(outputs).find(
    (file) => outputs[file].entryPoint === "consumer.js",
  );
  writeFileSync(`${outdir}/metafile.json`, JSON.stringify(result.metafile));
  return downloadSize(outputs, entry);
}

for (const [index, name] of ["component", "player"].entries()) {
  const baseline = await measure(cases[index], [], `${directory}/${name}/full`);
  const omissions = {};
  for (const [label, modules] of Object.entries(groups)) {
    const gzip = await measure(
      cases[index],
      modules,
      `${directory}/${name}/${Object.keys(omissions).length}`,
    );
    omissions[label] = { modules, gzip, difference: baseline - gzip };
  }
  const report = { name, esbuild: version, baseline, omissions };
  writeFileSync(
    `${directory}/${name}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
}
