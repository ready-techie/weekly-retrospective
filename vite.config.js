import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: false, // Disables minification, thus preserving console logs
  },
  assetsInclude: ["**/*.md"],
  base: "/weekly-retrospective/",
});
