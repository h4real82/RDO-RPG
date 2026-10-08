import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'http://127.0.0.1:4174';
const output = path.join(root, 'data/runtime/valentine/test-artifacts/reference-renders');
const baseline = process.env.REFERENCE_BASELINE_DIR;
let server;

function stopServer() {
  if (!server?.pid) return;
  if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else server.kill();
}

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try { await new Promise((resolve, reject) => http.get(url, (response) => response.statusCode === 200 ? resolve() : reject()).on('error', reject)); return; }
    catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  throw new Error('Reference-render server did not start.');
}

try {
  const poses = JSON.parse(await readFile(path.join(root, 'data/runtime/valentine/reference-camera-poses.json'), 'utf8'));
  if (poses.version !== 1 || poses.world !== 'valentine') throw new Error('Unsupported reference-pose contract.');
  await mkdir(output, { recursive: true });
  const command = process.platform === 'win32' ? process.env.ComSpec : 'pnpm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm --filter @rdo-rpg/client dev --host 127.0.0.1 --port 4174'] : ['--filter', '@rdo-rpg/client', 'dev', '--host', '127.0.0.1', '--port', '4174'];
  server = spawn(command, args, { cwd: root, stdio: 'ignore' });
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#game-container')?.getAttribute('data-game-ready') === 'true');
    for (const pose of poses.poses) {
      if (pose.projection !== 'orthographic') throw new Error(`Pose ${pose.id} is not orthographic.`);
      await page.evaluate(async (referencePose) => {
        window.__rdoPreview?.teleport(referencePose.target);
        window.__rdoPreview?.setReferenceCamera(referencePose.position, referencePose.target);
        await window.__rdoPreview?.waitForChunks();
      }, pose);
      const state = await page.evaluate(() => window.__rdoPreview?.getState());
      if (!state || state.cameraType !== 'OrthographicCamera') throw new Error(`Pose ${pose.id} has no orthographic runtime camera.`);
      await page.screenshot({ path: path.join(output, `${pose.id}.png`) });
      if (baseline) {
        const candidate = path.join(baseline, `${pose.id}.png`);
        await access(candidate);
        const [actual, expected] = await Promise.all([readFile(path.join(output, `${pose.id}.png`)), readFile(candidate)]);
        if (!actual.equals(expected)) throw new Error(`Reference baseline mismatch: ${pose.id}`);
      }
    }
  } finally { await browser.close(); }
  console.log(`Captured ${poses.poses.length} deterministic Valentine reference renders.`);
} finally { stopServer(); }
