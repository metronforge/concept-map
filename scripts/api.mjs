import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
const base = ExtractorConfig.loadFile("api-extractor.json");
for (const [name, entry] of Object.entries({
  "concept-map": "index",
  layout: "layout/index",
  dagre: "layout/dagre",
  elk: "layout/elk",
  browser: "dom/measureLabel",
})) {
  const config = ExtractorConfig.prepare({
    configObject: {
      ...base,
      projectFolder: process.cwd(),
      mainEntryPointFilePath: `<projectFolder>/dist/${entry}.d.ts`,
      apiReport: { ...base.apiReport, reportFileName: `${name}.api.md` },
    },
    configObjectFullPath: process.cwd() + "/api-extractor.json",
    packageJsonFullPath: process.cwd() + "/package.json",
  });
  if (
    !Extractor.invoke(config, { localBuild: process.argv.includes("--local") })
      .succeeded
  )
    process.exitCode = 1;
}
