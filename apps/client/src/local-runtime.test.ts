// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createLocalRuntimeMiddleware } from '../local-runtime';

let directory: string, root: string, server: Server, port: number;
beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'rdo-runtime-test-'));
  root = join(directory, 'runtime'); mkdirSync(root);
  writeFileSync(join(root, 'manifest.json'), '{"world":"valentine"}');
  writeFileSync(join(directory, 'private.json'), '{"private":true}');
  symlinkSync(directory, join(root, 'outside'), 'junction');
  server = createServer(createLocalRuntimeMiddleware(root));
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No test port');
  port = address.port;
});
afterAll(async () => {
  if (server) await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
  if (directory) {
    const base = resolve(tmpdir());
    if (!resolve(directory).startsWith(base + '\\') && !resolve(directory).startsWith(base + '/')) throw new Error('Unsafe test cleanup');
    rmSync(directory, { recursive: true, force: true });
  }
});
function get(path: string, method = 'GET') {
  return new Promise<{ status: number; contentType?: string; body: string }>((done, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method }, response => {
      let body = ''; response.setEncoding('utf8'); response.on('data', chunk => body += chunk);
      response.on('end', () => done({ status: response.statusCode ?? 0, contentType: response.headers['content-type'], body }));
    }); req.on('error', reject); req.end();
  });
}
describe('explicit local runtime serving', () => {
  it('serves JSON instead of SPA HTML', async () => {
    const response = await get('/manifest.json');
    expect(response.status).toBe(200); expect(response.contentType).toBe('application/json');
    expect(JSON.parse(response.body)).toEqual({ world: 'valentine' });
  });
  it('returns a real 404 for missing files', async () => { expect((await get('/missing.json')).status).toBe(404); });
  it('rejects encoded traversal outside the selected runtime', async () => { expect((await get('/..%2fprivate.json')).status).toBe(403); });
  it('rejects links escaping the selected runtime', async () => { expect((await get('/outside/private.json')).status).toBe(403); });
  it('handles malformed escapes and disallows writes', async () => {
    expect((await get('/%ZZ')).status).toBe(400); expect((await get('/manifest.json', 'POST')).status).toBe(405);
  });
  it('supports HEAD without sending a response body', async () => {
    const response = await get('/manifest.json', 'HEAD');
    expect(response.status).toBe(200); expect(response.body).toBe('');
  });
});
