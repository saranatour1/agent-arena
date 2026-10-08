/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Social meta tags need absolute URLs: the deployment's .convex.site host.
const siteUrl = (): Plugin => {
  let url = "";
  return {
    name: "site-url",
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, "VITE_");
      url = (process.env.VITE_CONVEX_URL ?? env.VITE_CONVEX_URL ?? "").replace(".convex.cloud", ".convex.site");
    },
    transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", url),
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    siteUrl(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "convex",
          include: ["convex/**/*.test.ts"],
          environment: "edge-runtime",
          server: { deps: { inline: ["convex-test"] } },
        },
      },
      {
        extends: true,
        test: {
          name: "web",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./src/test-setup.ts"],
        },
      },
    ],
  },
});
