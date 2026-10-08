import { execFileSync, spawn } from 'node:child_process';
import http from 'node:http';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'http://127.0.0.1:4173';
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
  throw new Error('Valentine preview server did not become available.');
}

async function main() {
  const command = process.platform === 'win32' ? process.env.ComSpec : 'pnpm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm --filter @rdo-rpg/client dev --host 127.0.0.1 --port 4173'] : ['--filter', '@rdo-rpg/client', 'dev', '--host', '127.0.0.1', '--port', '4173'];
  server = spawn(command, args, { cwd: root, stdio: 'ignore' });
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#game-container')?.getAttribute('data-game-ready') === 'true');
    const before = await page.evaluate(() => window.__rdoPreview?.getState());
    const screenshots = path.join(root, 'data/runtime/valentine/test-artifacts/zoom');
    await mkdir(screenshots, { recursive: true });
    await page.screenshot({ path: path.join(screenshots, 'default.png') });
    await page.locator('canvas').hover();
    await page.mouse.wheel(0, -1000);
    await page.waitForFunction(() => window.__rdoPreview?.getState().viewHeight < 13);
    await page.screenshot({ path: path.join(screenshots, 'near.png') });
    await page.keyboard.press('-');
    await page.waitForFunction(() => window.__rdoPreview?.getState().viewHeight > 14);
    await page.keyboard.press('+');
    await page.waitForFunction(() => window.__rdoPreview?.getState().viewHeight < 13);
    await page.keyboard.press('0');
    await page.waitForFunction(() => Math.abs(window.__rdoPreview.getState().viewHeight - 36) < 0.01);
    await page.keyboard.down('w');
    await page.waitForTimeout(200);
    await page.keyboard.up('w');
    const after = await page.evaluate(() => window.__rdoPreview?.getState());
    await page.keyboard.down('w');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(50);
    const blurred = await page.evaluate(() => window.__rdoPreview?.getState());
    await page.waitForTimeout(200);
    const inactive = await page.evaluate(() => window.__rdoPreview?.getState());
    await page.keyboard.up('w');
    if (blurred.player.z !== inactive.player.z) throw new Error('Movement continued after window blur.');
    await page.evaluate(() => window.__rdoPreview?.teleport({ x: -259.0177, y: 120.1503, z: 741.3681 }));
    await page.keyboard.press('e');
    await page.waitForSelector('section[role="dialog"]');
    const dialogPosition = await page.evaluate(() => window.__rdoPreview?.getState().player);
    await page.keyboard.press('+');
    await page.locator('canvas').dispatchEvent('wheel', { deltaY: -1000, bubbles: true });
    await page.waitForTimeout(500);
    const menuHeight = await page.evaluate(() => window.__rdoPreview.getState().viewHeight);
    if (Math.abs(menuHeight - 36) > 0.02) throw new Error('Zoom changed behind an open menu.');
    await page.keyboard.down('w');
    await page.waitForTimeout(200);
    await page.keyboard.up('w');
    const dialogAfter = await page.evaluate(() => window.__rdoPreview?.getState().player);
    if (JSON.stringify(dialogPosition) !== JSON.stringify(dialogAfter)) throw new Error('Player moved while the POI dialog was open.');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('section[role="dialog"]'));
    if (!before || !after || after.frame <= before.frame || after.player.z === before.player.z || after.cameraType !== 'OrthographicCamera' || errors.length) {
      throw new Error(`Preview errors: ${errors.join('; ')}`);
    }
    console.log('Valentine vertical-slice browser smoke test passed.');
  } finally {
    await browser.close();
  }
}

try {
  await main();
} finally {
  stopServer();
}
