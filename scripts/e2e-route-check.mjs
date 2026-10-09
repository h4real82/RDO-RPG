import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'http://127.0.0.1:4174';
const tracePath = path.join(root, 'data/runtime/valentine/local-preview/ground-truth-traces.json');
const artifactDir = path.join(root, 'data/runtime/valentine/test-artifacts');
const traceId = process.argv[4] ?? 'valentine:road:0062';
const from = Number(process.argv[2] ?? 12);
const to = Number(process.argv[3] ?? 20);
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
  throw new Error('Valentine route preview server did not become available.');
}

async function readRoute() {
  if (!existsSync(tracePath)) throw new Error(`Missing local source traces: ${tracePath}`);
  const source = JSON.parse(await readFile(tracePath, 'utf8'));
  const trace = source.traces.find((item) => item.id === traceId && item.kind === 'road');
  if (!trace) throw new Error(`Source road trace not found: ${traceId}`);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from === to
    || from >= trace.points.length || to >= trace.points.length) {
    throw new Error(`Expected distinct integer route indices within 0..${trace.points.length - 1}`);
  }
  return trace.points;
}

async function main() {
  const points = await readRoute();
  const command = process.platform === 'win32' ? process.env.ComSpec : 'pnpm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'pnpm --filter @rdo-rpg/client dev --host 127.0.0.1 --port 4174']
    : ['--filter', '@rdo-rpg/client', 'dev', '--host', '127.0.0.1', '--port', '4174'];
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
    await page.evaluate((point) => window.__rdoPreview.teleport({ x: point.x, y: -999, z: point.z }), points[from]);
    await page.evaluate(() => window.__rdoPreview.waitForChunks());
    await page.waitForTimeout(150);
    const start = (await page.evaluate(() => window.__rdoPreview.getState())).player;
    if (start.y < -900) throw new Error(`Source point ${from} has no loaded terrain at X ${start.x}, Z ${start.z}`);
    const pressed = new Set();
    let failure;
    let reached = from;
    try {
      const direction = Math.sign(to - from);
      for (let index = from + direction; direction * (index - to) <= 0; index += direction) {
        const target = points[index];
        let arrived = false;
        let stalled = 0;
        let previous;
        for (let step = 0; step < 130; step += 1) {
          const current = (await page.evaluate(() => window.__rdoPreview.getState())).player;
          if (Math.hypot(target.x - current.x, target.z - current.z) < 1.7) {
            arrived = true;
            reached = index;
            break;
          }
          const wanted = new Set();
          if (target.x - current.x > 0.6) wanted.add('d');
          if (target.x - current.x < -0.6) wanted.add('a');
          if (target.z - current.z > 0.6) wanted.add('s');
          if (target.z - current.z < -0.6) wanted.add('w');
          for (const key of pressed) if (!wanted.has(key)) await page.keyboard.up(key);
          for (const key of wanted) if (!pressed.has(key)) await page.keyboard.down(key);
          pressed.clear();
          for (const key of wanted) pressed.add(key);
          await page.waitForTimeout(250);
          const next = (await page.evaluate(() => window.__rdoPreview.getState())).player;
          stalled = previous && Math.hypot(next.x - previous.x, next.z - previous.z) < 0.08 ? stalled + 1 : 0;
          previous = next;
          if (stalled >= 5) break;
        }
        if (!arrived) {
          failure = {
            index,
            target,
            player: (await page.evaluate(() => window.__rdoPreview.getState())).player,
            collision: await page.evaluate(() => window.__rdoPreview.getCollisionHit()),
          };
          break;
        }
      }
    } finally {
      for (const key of pressed) await page.keyboard.up(key);
    }
    await mkdir(artifactDir, { recursive: true });
    const screenshot = path.join(artifactDir, `route-${traceId.replace(/[^a-z0-9-]/gi, '-')}-${from}-${to}.png`);
    await page.screenshot({ path: screenshot });
    console.log(JSON.stringify({ traceId, from, to, reached, failure, errors, screenshot }, null, 2));
    if (failure || errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

try {
  await main();
} finally {
  stopServer();
}
