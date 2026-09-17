import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// External backend (self-hosted Supabase project) used by this app.
// These override any managed values so both preview and the published site
// always talk to the same external database.
const EXTERNAL_SUPABASE_URL = "https://irnslzdercosofvywifc.supabase.co";
const EXTERNAL_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybnNsemRlcmNvc29mdnl3aWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NDE1MjMsImV4cCI6MjEwNDQxNzUyM30.sHueyfQsY4XyaHZruP4hsVPTLv3gZd5ijYKURIvW7jU";
const EXTERNAL_SUPABASE_PROJECT_ID = "irnslzdercosofvywifc";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(EXTERNAL_SUPABASE_URL),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      EXTERNAL_SUPABASE_PUBLISHABLE_KEY
    ),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
      EXTERNAL_SUPABASE_PROJECT_ID
    ),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
