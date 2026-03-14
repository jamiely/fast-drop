import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const distIndex = path.join(projectRoot, 'dist', 'index.html');
const mainFile = path.join(projectRoot, 'electron', 'main.mjs');
const preloadFile = path.join(projectRoot, 'electron', 'preload.mjs');

const failures = [];

if (!fs.existsSync(mainFile)) {
  failures.push('Missing electron/main.mjs');
}

if (!fs.existsSync(preloadFile)) {
  failures.push('Missing electron/preload.mjs');
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

console.log('[electron-smoke] Desktop packaging prerequisites look good.');
