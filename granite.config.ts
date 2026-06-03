import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "checkking",
  brand: {
    displayName: "등교왕",
    primaryColor: "#1a5fb4",
    icon: "https://static.toss.im/appsintoss/33199/d5847906-1a95-40a9-8b40-fb40ac611928.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
  webViewProps: {
    type: "partner",
  },
});
