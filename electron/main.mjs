import { app, BrowserWindow, nativeImage } from 'electron';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !!process.env.VITE_DEV_SERVER_URL;
const isSmokeMode = process.env.FAST_DROP_ELECTRON_SMOKE === '1';

const resolveAppIconPath = () => {
  const candidatePaths = [
    path.join(__dirname, '..', 'dist', 'favicon.jpg'),
    path.join(__dirname, '..', 'public', 'favicon.jpg')
  ];

  return candidatePaths.find((candidatePath) => existsSync(candidatePath));
};

const createWindow = async () => {
  const iconPath = resolveAppIconPath();

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    show: !isSmokeMode,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
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
  const iconPath = resolveAppIconPath();

  if (process.platform === 'darwin' && iconPath) {
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }

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
