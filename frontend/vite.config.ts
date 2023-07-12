import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    // Tauri supports es2021
    target: ['es2022', 'chrome100', 'safari15'],
  }
})
