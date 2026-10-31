import { createReadStream, realpathSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';

/** Read-only assets from one explicitly selected generated runtime directory. */
export function createLocalRuntimeMiddleware(directory: string) {
  const types: Record<string, string> = { '.json': 'application/json', '.glb': 'model/gltf-binary',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.woff2': 'font/woff2' };
  return (request: IncomingMessage, response: ServerResponse): void => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.statusCode = 405; response.setHeader('Allow', 'GET, HEAD'); response.end(); return;
    }
    let pathname: string;
    try { pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname); }
    catch { response.statusCode = 400; response.end(); return; }
    try {
      const root = realpathSync(directory);
      const candidate = resolve(root, `.${pathname}`);
      if (!candidate.startsWith(root + sep)) { response.statusCode = 403; response.end(); return; }
      const file = realpathSync(candidate);
      if (!file.startsWith(root + sep)) { response.statusCode = 403; response.end(); return; }
      const info = statSync(file), type = types[extname(file).toLowerCase()];
      if (!info.isFile() || !type) { response.statusCode = 404; response.end(); return; }
      response.setHeader('Content-Type', type); response.setHeader('Content-Length', info.size);
      if (request.method === 'HEAD') { response.end(); return; }
      const stream = createReadStream(file);
      stream.on('error', () => {
        if (response.headersSent) response.destroy();
        else { response.removeHeader('Content-Length'); response.statusCode = 500; response.end(); }
      });
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    } catch { response.statusCode = 404; response.end(); }
  };
}
