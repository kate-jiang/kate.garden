import assert from "node:assert/strict";
import { test } from "node:test";
import { build, type Rollup } from "vite";

test("entry bundles keep Three.js behind the dynamic garden import", async () => {
  const result = await build({ logLevel: "silent", build: { write: false } });
  assert.ok(!Array.isArray(result) && "output" in result);
  const chunks = result.output.filter((item): item is Rollup.OutputChunk => item.type === "chunk");
  const graph = new Map(chunks.map(chunk => [chunk.fileName, chunk]));
  function dependencies(
    chunk: Rollup.OutputChunk,
    includeDynamic = false,
    visited = new Set<string>()
  ): string[] {
    if (visited.has(chunk.fileName)) return [];
    visited.add(chunk.fileName);
    return [
      ...Object.keys(chunk.modules),
      ...[...chunk.imports, ...(includeDynamic ? chunk.dynamicImports : [])].flatMap(file =>
        dependencies(graph.get(file)!, includeDynamic, visited)
      ),
    ];
  }
  for (const name of ["main", "lite"]) {
    const entry = chunks.find(chunk => chunk.isEntry && chunk.name === name);
    assert.ok(entry, `Missing ${name} entry`);
    assert.deepEqual(
      dependencies(entry, name === "lite").filter(id =>
        /node_modules\/three\/|src\/scene\//.test(id)
      ),
      []
    );
  }
  const main = chunks.find(chunk => chunk.isEntry && chunk.name === "main")!;
  assert.ok(dependencies(main, true).some(id => id.endsWith("/src/scene/garden.ts")));
  for (const page of ["index.html", "lite.html"]) {
    const asset: Rollup.OutputAsset | Rollup.OutputChunk | undefined = result.output.find(
      item => item.fileName === page
    );
    assert.ok(asset && asset.type === "asset");
    const html: string = String(asset.source);
    assert.equal((html.match(/id="audio-player"/g) ?? []).length, 1);
    assert.equal((html.match(/id="modal"/g) ?? []).length, 1);
    assert.ok(!/<!-- (include|site):/.test(html));
  }
});
