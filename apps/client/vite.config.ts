import { defineConfig, type ViteDevServer } from 'vite';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

/** Only the explicit local preview directories are exposed; raw inputs stay private. */
function installLocalRuntime(server: Pick<ViteDevServer, 'middlewares'>): void {
  const mime: Record<string,string>={'.json':'application/json','.glb':'model/gltf-binary','.png':'image/png',
    '.jpg':'image/jpeg','.webp':'image/webp','.css':'text/css','.woff2':'font/woff2','.txt':'text/plain'};
  const mount=(url: string,folder: string): void=> {
    const root=resolve(__dirname,folder);
    server.middlewares.use(url,(request,response)=> {
      try {
        const pathname=decodeURIComponent(new URL(request.url??'/','http://localhost').pathname);
        const candidate=resolve(root,`.${pathname}`);
        if(!candidate.startsWith(`${root}${sep}`) || !existsSync(candidate) || !statSync(candidate).isFile()) {
          response.statusCode=404;response.end('Local preview asset unavailable');return;
        }
        response.setHeader('Content-Type',mime[extname(candidate)]??'application/octet-stream');
        const stream=createReadStream(candidate);
        stream.on('error',()=>{response.statusCode=500;response.end('Local preview asset unreadable');});
        stream.pipe(response);
      } catch {response.statusCode=400;response.end('Invalid local preview path');}
    });
  };
  mount('/runtime/valentine/verified-scene','../../data/runtime/valentine/verified-scene');
  mount('/runtime/valentine/local-preview','../../data/runtime/valentine/local-preview');
  mount('/runtime/valentine/frontier-ui','../../data/runtime/valentine/frontier-ui');
  mount('/runtime/player-models','../../data/runtime/player-models');
  const file=(url: string,path: string): void=> {
    server.middlewares.use(url,(request,response)=> {
      try {
        const candidate=resolve(__dirname,path);
        if(new URL(request.url??'/','http://localhost').pathname!=='/' || !existsSync(candidate)) {
          response.statusCode=404;response.end('Local preview data unavailable');return;
        }
        response.setHeader('Content-Type','application/json');
        const stream=createReadStream(candidate);
        stream.on('error',()=>{response.statusCode=500;response.end('Local preview data unreadable');});
        stream.pipe(response);
      } catch {response.statusCode=400;response.end('Invalid local preview data path');}
    });
  };
  file('/runtime/valentine/placement-recovery/landmark-source-recovery.json','../../data/runtime/valentine/placement-recovery/landmark-source-recovery.json');
  file('/runtime/valentine/pois.json','../../data/runtime/valentine/pois.json');
}

export default defineConfig({
  plugins: [{
    name: 'local-valentine-runtime-preview',
    configureServer: installLocalRuntime,
    configurePreviewServer: installLocalRuntime,
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
    target: 'esnext',
    rollupOptions:{input:{app:resolve(__dirname,'index.html'),map:resolve(__dirname,'map-preview.html')}}
  }
  ,preview:{proxy:{'/api':{target:'http://127.0.0.1:2567',changeOrigin:true}}}
});
