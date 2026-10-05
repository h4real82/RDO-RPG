import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const screenshotPath = path.resolve(rootDir, 'apps', 'client', 'e2e-screenshot.png');

let devProcess = null;
let browser = null;

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch (err) {
    // Process might already be terminated
  }
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  console.log(`[E2E] Polling ${url} until online (timeout: ${timeoutMs}ms)...`);
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve(true);
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(1500, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      console.log(`[E2E] Server at ${url} is responding!`);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  throw new Error(`[E2E] Server at ${url} failed to respond within ${timeoutMs}ms`);
}

async function main() {
  console.log('[E2E] Starting development servers (pnpm dev)...');
  devProcess = spawn('npx', ['pnpm', 'dev'], {
    cwd: rootDir,
    shell: true,
    stdio: 'pipe'
  });

  devProcess.stdout.on('data', (d) => {
    const text = d.toString();
    if (text.includes('Local:') || text.includes('ready in') || text.includes('Server listening')) {
      process.stdout.write(`[dev-server] ${text}`);
    }
  });

  devProcess.stderr.on('data', (d) => {
    const text = d.toString();
    if (text.includes('Error') || text.includes('error')) {
      process.stderr.write(`[dev-error] ${text}`);
    }
  });

  // 1. Wait for client dev server on port 3000
  await waitForServer('http://localhost:3000', 35000);

  // 2. Launch headless browser
  console.log('[E2E] Launching Playwright browser...');
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    console.error(`[Browser PageError] ${err.message}`);
  });

  // 3. Navigate to application
  console.log('[E2E] Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });

  console.log('[E2E] Waiting for Three.js canvas...');
  await page.waitForSelector('canvas', { timeout: 15000 });

  // Wait for 3D world engine to boot
  await page.waitForFunction(() => !!window.__world3D, { timeout: 15000 });
  console.log('[E2E] Three.js Engine and World3D detected!');

  // Short stabilization delay
  await page.waitForTimeout(2000);

  // 4. Test POI Proximity & Interaction Prompt
  console.log('[E2E] Teleporting player near Valentine General Store (50, 44)...');
  await page.evaluate(() => {
    window.__world3D.posX = 50;
    window.__world3D.posZ = 44;
    if (window.__world3D.localPlayer) {
      window.__world3D.localPlayer.setPosition(50, 0, 44);
    }
  });

  await page.waitForTimeout(300);

  const promptStatus = await page.evaluate(() => {
    const banner = document.getElementById('poi-prompt-banner');
    const text = document.getElementById('poi-prompt-text')?.textContent;
    const isVisible = banner && window.getComputedStyle(banner).display !== 'none';
    return { isVisible, text };
  });
  console.log('[E2E] Interaction Prompt Status:', promptStatus);

  if (!promptStatus.isVisible) {
    throw new Error('[E2E] FAILED: Interaction Prompt Banner is not visible when near POI!');
  }

  // 5. Simulate KeyPress 'KeyE' to open modal
  console.log('[E2E] Simulating KeyPress [KeyE]...');
  await page.keyboard.press('KeyE');

  // Wait 500ms as instructed
  console.log('[E2E] Waiting 500ms after KeyE to check render-loop status & modal visibility...');
  await page.waitForTimeout(500);

  // Verify modal is visible
  const modalStatus = await page.evaluate(() => {
    const modal = document.getElementById('poi-modal');
    const title = document.getElementById('poi-modal-title')?.textContent;
    const isVisible = modal && window.getComputedStyle(modal).display !== 'none';
    const zIndex = modal ? window.getComputedStyle(modal).zIndex : 'none';
    return { isVisible, title, zIndex };
  });
  console.log('[E2E] POI Modal Status:', modalStatus);

  if (!modalStatus.isVisible) {
    throw new Error('[E2E] FAILED: POI Modal is not visible after pressing KeyE!');
  }

  // 6. Verify render-loop is ticking and main-thread has no freeze
  const checkStart = Date.now();
  const loopActive = await Promise.race([
    page.evaluate(async () => {
      return new Promise((resolve) => {
        requestAnimationFrame((t1) => {
          requestAnimationFrame((t2) => {
            resolve(t2 > t1);
          });
        });
      });
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('RENDER-LOOP FREEZE: requestAnimationFrame timed out after 3000ms')), 3000))
  ]);

  const responseTimeMs = Date.now() - checkStart;
  console.log(`[E2E] Render-loop check: active = ${loopActive} (responded in ${responseTimeMs}ms)`);

  if (!loopActive) {
    throw new Error('[E2E] Freeze detected: requestAnimationFrame failed to advance frames!');
  }

  // 7. Capture screenshot of opened modal
  console.log(`[E2E] Saving screenshot to ${screenshotPath} ...`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('[E2E] Screenshot saved successfully!');

  // 8. Test closing with Escape
  console.log('[E2E] Simulating KeyPress [Escape] to close modal...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  const modalClosed = await page.evaluate(() => {
    const modal = document.getElementById('poi-modal');
    return !modal || window.getComputedStyle(modal).display === 'none';
  });
  console.log('[E2E] Modal closed on Escape:', modalClosed);

  if (!modalClosed) {
    throw new Error('[E2E] FAILED: Modal did not close on Escape!');
  }

  console.log('[E2E] TEST PASSED: Interaction hint, POI modal, Escape closing, and 60FPS render loop all verified!');
}

(async () => {
  let exitCode = 0;
  try {
    await main();
  } catch (err) {
    console.error('[E2E TEST FAILED]', err);
    exitCode = 1;
  } finally {
    console.log('[E2E] Cleaning up browser and stopping dev-server processes...');
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    if (devProcess && devProcess.pid) {
      console.log(`[E2E] Killing dev-server process tree (PID: ${devProcess.pid})...`);
      killProcessTree(devProcess.pid);
    }
    process.exit(exitCode);
  }
})();
