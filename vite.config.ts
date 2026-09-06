import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { htmlFragments } from "./build/html-fragments";

export default defineConfig({
  plugins: [htmlFragments()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: new URL("index.html", import.meta.url).pathname,
        lite: new URL("lite.html", import.meta.url).pathname,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
