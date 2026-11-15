import { build } from "rolldown";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

export async function bundleSizes() {
  const result = {};
  for (const engine of ["dagre", "elk"]) {
    const output = await build({
      input: "comparison-entry",
      platform: "browser",
      external: [],
      plugins: [
        {
          name: "comparison-entry",
          resolveId(id) {
            if (id === "comparison-entry") return id;
          },
          load(id) {
            if (id === "comparison-entry")
              return `export { layout } from ${JSON.stringify(resolve("dist/layout/index.js"))}; export { ${engine}Engine } from ${JSON.stringify(resolve(`dist/layout/${engine}.js`))};`;
          },
        },
      ],
      onLog(level, log, handler) {
        if (log.code === "UNRESOLVED_IMPORT") throw new Error(log.message);
        handler(level, log);
      },
      output: { minify: true, format: "esm", codeSplitting: false },
      write: false,
    });
    if (
      output.output.length !== 1 ||
      output.output[0].type !== "chunk" ||
      output.output[0].imports.length ||
      output.output[0].dynamicImports.length
    )
      throw new Error("Expected one self-contained browser bundle per engine");
    const code = output.output[0].code;
    result[engine] = {
      raw: Buffer.byteLength(code),
      gzip: gzipSync(code, { level: 9 }).length,
    };
  }
  return result;
}
