import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";
import { htmlFragments } from "../../build/html-fragments";
import { site, links } from "../../src/content/site";

test("HTML insertion preserves replacement tokens in metadata, links and fragments", async context => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "garden-html-")));
  const originalTitle = site.title;
  const originalLabel = links[0].label;
  context.after(async () => {
    Object.assign(site, { title: originalTitle });
    Object.assign(links[0], { label: originalLabel });
    await rm(root, { recursive: true, force: true });
  });
  const literal = "$& $$ $` $'";
  const escaped = "$&amp; $$ $` $&#39;";
  Object.assign(site, { title: literal });
  Object.assign(links[0], { label: literal });
  await mkdir(join(root, "src/content"), { recursive: true });
  await writeFile(join(root, "src/content/about.html"), `<p>${literal}</p>`);
  await writeFile(
    join(root, "index.html"),
    "<!doctype html><html><head><!-- site:head --></head><body><!-- site:navigation --><!-- include:about --></body></html>"
  );
  const result = await build({
    root,
    configFile: false,
    logLevel: "silent",
    plugins: [htmlFragments()],
    build: { write: false },
  });
  assert.ok(!Array.isArray(result) && "output" in result);
  const asset = result.output.find(item => item.fileName === "index.html");
  assert.ok(asset && asset.type === "asset");
  const html = String(asset.source);
  assert.ok(html.includes(`<title>${escaped}</title>`));
  assert.ok(html.includes(`data-panel="about">${escaped}</button>`));
  assert.ok(html.includes(`<p>${literal}</p>`));
});
