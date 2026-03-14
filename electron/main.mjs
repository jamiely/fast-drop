import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !!process.env.VITE_DEV_SERVER_URL;
const isSmokeMode = process.env.FAST_DROP_ELECTRON_SMOKE === '1';

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    show: !isSmokeMode,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isSmokeMode) {
    win.webContents.once('did-finish-load', () => {
      console.log('[electron-smoke] did-finish-load');
      setTimeout(() => app.quit(), 250);
    });

    win.webContents.once('did-fail-load', (_event, code, description) => {
      console.error(
        `[electron-smoke] did-fail-load code=${code} description=${description}`
      );
      app.exit(1);
    });
  }

  if (isDev) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);

    if (!isSmokeMode) {
      win.webContents.openDevTools({ mode: 'detach' });
    }

    return;
  }

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
};

app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
