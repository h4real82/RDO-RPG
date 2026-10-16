import { defineConfig } from 'vite';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

export default defineConfig({
  plugins: [{
    name: 'local-valentine-runtime-preview',
    configureServer(server) {
      const runtimeRoot = resolve(__dirname, '../../data/runtime/valentine/local-preview');
      server.middlewares.use('/runtime/valentine/placement-recovery/landmark-source-recovery.json', (_request, response) => {
        const report = resolve(runtimeRoot, '../placement-recovery/landmark-source-recovery.json');
        if (!existsSync(report)) { response.statusCode = 404; response.end('Source recovery report unavailable'); return; }
        response.setHeader('Content-Type', 'application/json');
        const stream = createReadStream(report);
        stream.on('error', () => { response.statusCode = 500; response.end('Source recovery report unreadable'); });
        stream.pipe(response);
      });
      server.middlewares.use('/runtime/valentine/local-preview', (request, response, next) => {
        const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
        const candidate = resolve(runtimeRoot, `.${pathname}`);
        if (!candidate.startsWith(`${runtimeRoot}${sep}`) || !existsSync(candidate) || !statSync(candidate).isFile()) return next();
        createReadStream(candidate).pipe(response);
      });
      server.middlewares.use('/runtime/valentine/pois.json', (_request, response) => {
        createReadStream(resolve(__dirname, '../../data/runtime/valentine/pois.json')).pipe(response);
      });
    },
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
});
