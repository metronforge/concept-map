import { test } from "node:test";
import { mkdtemp, mkdir, cp, symlink, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "vite";

const repository = resolve(".");
for (const peers of [["zod"], ["zod", "elkjs"]]) {
  test(`element consumer builds with only ${peers.join(" and ")}`, async () => {
    const root = await mkdtemp(join(tmpdir(), "concept-map-consumer-"));
    try {
      // Preserve the published manifest so Vite sees the real optional peers.
      const installed = join(root, "node_modules/@metronforge/concept-map");
      await mkdir(installed, { recursive: true });
      await cp(join(repository, "dist"), join(installed, "dist"), {
        recursive: true,
      });
      await cp(
        join(repository, "package.json"),
        join(installed, "package.json"),
      );
      for (const peer of peers)
        await symlink(
          join(repository, "node_modules", peer),
          join(root, "node_modules", peer),
          "dir",
        );
      await writeFile(
        join(root, "entry.js"),
        'import "@metronforge/concept-map/element";',
      );
      await writeFile(
        join(root, "index.html"),
        '<script type="module" src="./entry.js"></script>',
      );
      // Building discovers deferred imports even when a page uses ready maps.
      await build({ root, configFile: false, logLevel: "silent" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}
