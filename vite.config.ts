import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // Pyodide is loaded from CDN inside the worker, never bundle it.
    exclude: ['pyodide'],
  },
  server: {
    fs: {
      strict: false,
    },
  },
});
