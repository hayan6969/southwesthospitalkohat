import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const manualChunks = (id: string) => {
  if (!id.includes("node_modules")) return undefined;

  // Keep React and React DOM together - MUST NOT be separated
  if (
    id.includes("/react/") ||
    id.includes("/react-dom/") ||
    id.includes("/scheduler/")
  ) {
    return "react-vendor";
  }

  if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("dompurify")) {
    return "pdf-vendor";
  }

  if (id.includes("recharts") || id.includes("/d3-")) {
    return "chart-vendor";
  }

  if (id.includes("lucide-react")) {
    return "icons-vendor";
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
