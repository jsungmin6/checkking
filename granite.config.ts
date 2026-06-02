import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "school-check-in",
  brand: {
    displayName: "등교왕",
    primaryColor: "#1a5fb4",
    icon: "https://static.toss.im/appsintoss/placeholder.png",
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
