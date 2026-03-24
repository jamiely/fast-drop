import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import electronPath from 'electron';

const projectRoot = process.cwd();
const distIndex = path.join(projectRoot, 'dist', 'index.html');
const mainFile = path.join(projectRoot, 'electron', 'main.mjs');
const preloadFile = path.join(projectRoot, 'electron', 'preload.cjs');

const failures = [];

if (!fs.existsSync(mainFile)) {
  failures.push('Missing electron/main.mjs');
}

if (!fs.existsSync(preloadFile)) {
  failures.push('Missing electron/preload.cjs');
}

if (!fs.existsSync(distIndex)) {
  failures.push('Missing dist/index.html. Run `npm run build` first.');
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[electron-smoke] ${failure}`);
  }
  process.exit(1);
}

const timeoutMs = 20_000;
const child = spawn(electronPath, [mainFile], {
  cwd: projectRoot,
  env: {
    ...process.env,
    FAST_DROP_ELECTRON_SMOKE: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let sawDidFinishLoad = false;

const onData = (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  if (text.includes('[electron-smoke] did-finish-load')) {
    sawDidFinishLoad = true;
  }
};

child.stdout.on('data', onData);
child.stderr.on('data', onData);

const timeoutId = setTimeout(() => {
  child.kill('SIGKILL');
  console.error(`[electron-smoke] Timed out after ${timeoutMs}ms`);
  process.exit(1);
}, timeoutMs);

child.on('exit', (code) => {
  clearTimeout(timeoutId);

  if (code !== 0) {
    console.error(`[electron-smoke] Electron exited with code ${code}`);
    process.exit(1);
  }

  if (!sawDidFinishLoad) {
    console.error(
      '[electron-smoke] Electron exited before confirming page load.'
    );
    process.exit(1);
  }

  console.log(
    '[electron-smoke] Electron launched and loaded packaged app successfully.'
  );
});
