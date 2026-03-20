import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const manualChunks = (id: string) => {
  if (!id.includes("node_modules")) return undefined;

  if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("dompurify")) {
    return "pdf-vendor";
  }

  if (id.includes("recharts") || id.includes("/d3-")) {
    return "chart-vendor";
  }

  if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul") || id.includes("embla-carousel")) {
    return "ui-vendor";
  }

  if (id.includes("@supabase")) {
    return "backend-vendor";
  }

  if (id.includes("react-router")) {
    return "router-vendor";
  }

  if (id.includes("@tanstack/react-query")) {
    return "query-vendor";
  }

  if (id.includes("react-day-picker") || id.includes("date-fns") || id.includes("date-fns-tz")) {
    return "date-vendor";
  }

  if (id.includes("lucide-react")) {
    return "icons-vendor";
  }

  if (
    id.includes("react") ||
    id.includes("react-dom") ||
    id.includes("scheduler")
  ) {
    return "react-vendor";
  }

  return "vendor";
};

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
}));
