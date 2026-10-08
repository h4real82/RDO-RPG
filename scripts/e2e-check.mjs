import { execFileSync, spawn } from 'node:child_process';
import http from 'node:http';
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
    await page.keyboard.down('w');
    await page.waitForTimeout(200);
    await page.keyboard.up('w');
    await page.evaluate(() => window.__rdoPreview?.teleport({ x: -259.0177, y: 120.1503, z: 741.3681 }));
    await page.keyboard.press('e');
    await page.waitForSelector('section[role="dialog"]');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('section[role="dialog"]'));
    const loopActive = await page.evaluate(() => new Promise((resolve) => requestAnimationFrame((first) => requestAnimationFrame((second) => resolve(second > first)))));
    if (!loopActive || errors.length) throw new Error(`Preview errors: ${errors.join('; ')}`);
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
