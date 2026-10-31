import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { createLocalRuntimeMiddleware } from './local-runtime';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'RDO_');
  const runtime = resolve(__dirname, env.RDO_VALENTINE_RUNTIME_DIR || '../../data/runtime/valentine');
  return {
  plugins: [{
    name: 'explicit-local-valentine-runtime',
    configureServer(server) { server.middlewares.use('/runtime/valentine', createLocalRuntimeMiddleware(runtime)); },
    configurePreviewServer(server) { server.middlewares.use('/runtime/valentine', createLocalRuntimeMiddleware(runtime)); },
  }],
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
  };
});
