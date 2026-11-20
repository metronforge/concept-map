import { gzipSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import cases from "../.size-limit.js";

// Install the audit-only esbuild separately; do not add a package dependency.
const { build, version } = await import(
  pathToFileURL(process.env.ESBUILD_PATH).href
);
if (version !== "0.28.0") throw new Error("Use esbuild 0.28.0 for this audit");
if (!process.argv[2])
  throw new Error("Pass an output directory outside the repo");
const directory = resolve(process.argv[2]);
const root = resolve(process.argv[3] ?? ".");
const names = [
  "component",
  "player",
  "server",
  "validation",
  "layout",
  "check",
  "root",
];
mkdirSync(directory, { recursive: true });

function firstDownload(outputs, entry) {
  const seen = new Set();
  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    for (const dependency of outputs[file].imports)
      if (dependency.kind !== "dynamic-import" && !dependency.external)
        visit(dependency.path);
  }
  visit(entry);
  return seen;
}

function summarize(name, outputs, files) {
  const modules = {};
  let minified = 0;
  let gzip = 0;
  for (const file of files) {
    const content = readFileSync(resolve(root, file));
    minified += content.length;
    gzip += gzipSync(content, { level: 9 }).length;
    for (const [input, contribution] of Object.entries(outputs[file].inputs)) {
      const name = input.replace(/^.*?(?=node_modules\/)/, "");
      modules[name] = (modules[name] ?? 0) + contribution.bytesInOutput;
    }
  }
  return {
    name,
    esbuild: version,
    minified,
    gzip,
    modules: Object.fromEntries(
      Object.entries(modules).sort((a, b) => b[1] - a[1]),
    ),
  };
}

for (const [index, scenario] of cases.entries()) {
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
    outdir: `${directory}/${names[index]}`,
  });
  const outputs = result.metafile.outputs;
  const entry = Object.keys(outputs).find(
    (file) => outputs[file].entryPoint === "consumer.js",
  );
  const report = summarize(
    scenario.name,
    outputs,
    firstDownload(outputs, entry),
  );
  writeFileSync(
    `${directory}/${names[index]}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  writeFileSync(
    `${directory}/${names[index]}-metafile.json`,
    JSON.stringify(result.metafile, null, 2) + "\n",
  );
  console.log(
    `${names[index]}: ${report.minified} minified B, ${report.gzip} gzip B`,
  );
}
