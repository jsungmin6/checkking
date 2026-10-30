import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "checkking",

  brand: {
    primaryColor: "#1a5fb4"
  },

  permissions: [
    { name: "camera", access: "access" },
    { name: "photos", access: "read" },
  ],
  webBundleDir: "dist",
  webView: {}
});
