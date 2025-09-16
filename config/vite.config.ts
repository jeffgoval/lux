import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
  },
  plugins: [
    react(),
    ...(mode === "development" ? [componentTagger()] : []),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src')
    }
  },
  root: resolve(__dirname, '..'),
  base: './',
  configFile: path.resolve(__dirname, "./vite.config.ts"),
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
  // Configurações para preview (teste local do build)
  preview: {
    port: 5174,
    host: "localhost",
    strictPort: true,
  },
}));
