import { execFileSync, spawn } from 'node:child_process';
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'http://127.0.0.1:4175';
const output = path.join(root, 'data/runtime/valentine/test-artifacts/spatial-calibration');
let server;

function stopServer() {
  if (!server?.pid) return;
  if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else server.kill();
}

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => http.get(url, (response) => response.statusCode === 200 ? resolve() : reject(new Error(String(response.statusCode)))).on('error', reject));
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('Spatial calibration preview server did not become available.');
}

function worldPosition(anchor) {
  return { x: anchor.position.x, y: anchor.position.elevation ?? 120, z: -anchor.position.gameY };
}

async function main() {
  const fixture = JSON.parse(await readFile(path.join(root, 'data/reference/valentine/spatial-anchors.json'), 'utf8'));
  const anchors = new Map(fixture.anchors.map((anchor) => [anchor.id, anchor]));
  const station = worldPosition(anchors.get('station-shell'));
  const saloon = worldPosition(anchors.get('saloon-shell'));
  const generalStore = { x: -323.0455, y: 120.5974, z: -799.5194 };
  const command = process.platform === 'win32' ? process.env.ComSpec : 'pnpm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'pnpm --filter @rdo-rpg/client dev --host 127.0.0.1 --port 4175']
    : ['--filter', '@rdo-rpg/client', 'dev', '--host', '127.0.0.1', '--port', '4175'];
  server = spawn(command, args, { cwd: root, stdio: 'ignore' });
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#game-container')?.getAttribute('data-game-ready') === 'true');
    await mkdir(output, { recursive: true });
    // Frame all frozen source anchors with a fixed geographic north-up camera.
    // This is a diagnostic overview, not a registered comparison to the paper map.
    const positions = fixture.anchors.map(worldPosition);
    const minX = Math.min(...positions.map((p) => p.x)) - 40;
    const maxX = Math.max(...positions.map((p) => p.x)) + 40;
    const minZ = Math.min(...positions.map((p) => p.z)) - 40;
    const maxZ = Math.max(...positions.map((p) => p.z)) + 40;
    const overviewHeight = Math.max(maxZ - minZ, (maxX - minX) / (1440 / 900));
    const overviewTarget = { x: (minX + maxX) / 2, y: 120, z: (minZ + maxZ) / 2 };
    await page.evaluate((target) => window.__rdoPreview.teleport(target), overviewTarget);
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__rdoPreview.waitForChunks());
    await page.evaluate(({ target, height }) => window.__rdoPreview.setReferenceCamera(
      { x: target.x, y: target.y + 400, z: target.z }, target, height,
    ), { target: overviewTarget, height: overviewHeight });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(output, 'valentine-north-up.png') });
    await writeFile(path.join(output, 'north-up-frame.json'), `${JSON.stringify({
      version: 1, projection: 'orthographic', screenUp: '-worldZ', screenRight: '+worldX',
      target: overviewTarget, visibleHeight: overviewHeight, viewport: { width: 1440, height: 900 },
      anchors: fixture.anchors.map((anchor) => ({ id: anchor.id, sourceFile: anchor.sourceFile, position: worldPosition(anchor) })),
      paperMapRegistration: 'not-verified',
    }, null, 2)}\n`);
    for (const [name, target] of [['station', station], ['saloon', saloon]]) {
      await page.evaluate((position) => window.__rdoPreview.teleport(position), target);
      await page.evaluate(() => window.__rdoPreview.waitForChunks());
      await page.evaluate((position) => window.__rdoPreview.setReferenceCamera(
        { x: position.x, y: position.y + 24, z: position.z + 18 }, position, 48,
      ), target);
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(output, `${name}-calibration-view.png`) });
    }
    await page.evaluate((position) => window.__rdoPreview.teleport(position), generalStore);
    await page.evaluate(() => window.__rdoPreview.waitForChunks());
    for (const [side, direction] of [['west', -1], ['east', 1]]) {
      await page.evaluate(({ position, direction }) => window.__rdoPreview.setReferenceCamera(
        { x: position.x + direction * 26, y: position.y + 8, z: position.z },
        { x: position.x, y: position.y + 4, z: position.z }, 18,
      ), { position: generalStore, direction });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(output, `general-store-${side}.png`) });
    }
    const transforms = await page.evaluate(() => window.__rdoPreview.getLoadedTransforms());
    const reflected = transforms.filter((item) => !Number.isFinite(item.determinant) || item.determinant <= 0);
    const report = {
      version: 1,
      basis: { x: 'gameX', y: 'gameZ', z: '-gameY', determinant: 1 },
      rejectedLegacyBasis: { x: 'gameX', y: 'gameZ', z: 'gameY', determinant: -1 },
      loadedTransformCount: transforms.length,
      reflectedTransforms: reflected,
      consoleErrors: errors,
    };
    await writeFile(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    if (!transforms.length || reflected.length || errors.length) throw new Error(JSON.stringify(report));
    console.log(`Spatial calibration passed with ${transforms.length} positive-determinant transforms.`);
  } finally {
    await browser.close();
  }
}

try {
  await main();
} finally {
  stopServer();
}
