import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { links, site } from "../src/content/site";

const fragments = {
  about: "src/content/about.html",
  player: "src/ui/player.html",
  dialog: "src/ui/dialog.html",
  "audio-controls": "src/ui/audio-controls.html",
};

function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!
  );
}

export function htmlFragments(): Plugin {
  let root = "";
  return {
    name: "site-html-fragments",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      const files = new Set(Object.values(fragments).map(file => resolve(root, file)));
      files.add(resolve(root, "src/content/site.ts"));
      server.watcher.add([...files]);
      server.watcher.on("change", file => {
        if (files.has(file)) server.ws.send({ type: "full-reload" });
      });
    },
    transformIndexHtml: {
      order: "pre",
      async handler(html) {
        const title = escape(site.title);
        const description = escape(site.description);
        const url = escape(site.url);
        html = html.replace(
          "<!-- site:head -->",
          () => `<title>${title}</title>
          <meta name="description" content="${description}" />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="${url}" />
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${url}/preview.png" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:url" content="${url}" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
          <meta name="twitter:image" content="${url}/preview.png" />`
        );
        const navigation = links
          .map(({ label, action }) =>
            action.type === "link"
              ? `<a href="${escape(action.url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`
              : `<button type="button" data-panel="${action.panel}">${escape(label)}</button>`
          )
          .join("\n");
        html = html.replace(
          "<!-- site:navigation -->",
          () => `<nav class="lite-links" aria-label="Main navigation">${navigation}</nav>`
        );
        for (let depth = 0; depth < 4 && html.includes("<!-- include:"); depth++) {
          for (const match of html.matchAll(/<!-- include:([\w-]+) -->/g)) {
            const file = fragments[match[1] as keyof typeof fragments];
            if (!file) throw new Error(`Unknown HTML fragment: ${match[1]}`);
            const fragment = await readFile(resolve(root, file), "utf8");
            html = html.replace(match[0], () => fragment);
          }
        }
        if (/<!-- (include|site):/.test(html)) throw new Error("Unresolved HTML fragment");
        return html;
      },
    },
  };
}
