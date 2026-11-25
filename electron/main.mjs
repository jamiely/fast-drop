import { app, BrowserWindow, nativeImage, screen } from 'electron';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !!process.env.VITE_DEV_SERVER_URL;
const isSmokeMode = process.env.FAST_DROP_ELECTRON_SMOKE === '1';
const startFullscreen = process.argv.includes('--fullscreen');

const resolveAppIconPath = () => {
  const candidatePaths = [
    path.join(__dirname, '..', 'dist', 'favicon.jpg'),
    path.join(__dirname, '..', 'public', 'favicon.jpg')
  ];

  return candidatePaths.find((candidatePath) => existsSync(candidatePath));
};

const createWindow = async () => {
  const iconPath = resolveAppIconPath();

  // Fill the display's work area in whatever orientation it has (a rotated cabinet monitor is tall), or start
  // fullscreen with `--fullscreen`. F11 toggles fullscreen at any time.
  const { workArea } = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    ...workArea,
    fullscreen: startFullscreen && !isSmokeMode,
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

  if (!startFullscreen && !isSmokeMode) {
    win.maximize();
  }

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    }
  });

  if (isSmokeMode) {
    win.webContents.once('did-finish-load', () => {
      const bounds = win.getContentBounds();
      console.log(
        `[electron-smoke] window=${bounds.width}x${bounds.height} workArea=${workArea.width}x${workArea.height}`
      );
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
