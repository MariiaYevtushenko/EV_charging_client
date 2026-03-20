import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset URLs — коректно на Vercel і GitHub Pages (підкаталоги без абсолютного /assets/…)
  base: './',
})
