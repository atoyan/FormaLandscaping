import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import pkgJSON from "./package.json";
import appsettings from "./appsettings.json";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    outDir: "build",
    target: "esnext",
  },
  plugins: [react({ jsxImportSource: "@emotion/react" }), svgr({ svgrOptions: { icon: true } })],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@fonts": path.resolve(__dirname, "./src/fonts"),
    },
  },
  server: {
    open: false,
    port: 3000,
    strictPort: true,
  },
  define: {
    __PACKAGE_JSON_VERSION__: JSON.stringify(pkgJSON.version),
  },
});
