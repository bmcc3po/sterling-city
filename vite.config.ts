import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 43180,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 43180,
    strictPort: true,
  },
  build: {
    target: "es2022",
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
});
