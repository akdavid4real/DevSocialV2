import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Route components are lazy-loaded in `src/router.tsx`, which splits the pages
 * out of the entry chunk. These groups do the same for the vendor half, so a
 * cold load pulls React + the shell rather than every dependency in the app.
 */
function manualChunks(id: string) {
  if (!id.includes("node_modules")) return;

  if (id.includes("react-router")) return "vendor-router";
  if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "vendor-react";
  if (id.includes("@tanstack")) return "vendor-query";
  if (id.includes("@supabase")) return "vendor-supabase";
  if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) {
    return "vendor-charts";
  }
  if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) {
    return "vendor-motion";
  }

  // Radix deliberately stays in `vendor`: its satellite deps (@floating-ui,
  // react-remove-scroll, aria-hidden…) are shared, and splitting it out
  // produces a circular chunk reference.
  return "vendor";
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: { manualChunks },
    },
  },
});
