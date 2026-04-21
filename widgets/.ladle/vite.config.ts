import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// Align with widgets/vite.config.ts — project uses @tailwindcss/vite, not @tailwindcss/postcss
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
