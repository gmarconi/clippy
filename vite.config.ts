import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/clippy/" : "/",
  root: "examples/browser",
  publicDir: resolve(import.meta.dirname, "public"),
  build: {
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, "dist-pages")
  }
});
