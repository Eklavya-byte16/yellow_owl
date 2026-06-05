import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "url"
import path from "path"

// This tells Vite exactly what the "@" symbol means
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind v4 plugin activated
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Maps "@/" directly to your "src/" folder
    },
  },
})