import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:2567',
        changeOrigin: true
      },
      '/colyseus': {
        target: 'ws://localhost:2567',
        ws: true
      }
    }
  },
  build: {
    target: 'esnext'
  }
});
