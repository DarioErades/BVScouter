import { app, BrowserWindow, ipcMain, dialog, protocol, net, session } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initDatabase } from './database.js';
import './ipc-handlers.js';

// pa manejar shortcuts en Windows al instalar/desinstalar
if (started) {
  app.quit();
}

app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1400,
    minHeight: 900,
    title: 'BVScouter - Scouting de voley playa',
    autoHideMenuBar: true, // oculta el menú superior por defecto
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.maximize();

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

};

import { pathToFileURL } from 'node:url';

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-video', privileges: { standard: true, secure: true, bypassCSP: true, supportFetchAPI: true, stream: true } }
]);

app.whenReady().then(() => {
  protocol.registerFileProtocol('local-video', (request, callback) => {
    try {
      const parsedUrl = new URL(request.url);
      const filePath = parsedUrl.searchParams.get('path');
      if (!filePath) {
        return callback({ error: -6 });
      }
      callback({ path: filePath });
    } catch (e) {
      console.error('Error handling local-video protocol:', e);
      callback({ error: -2 });
    }
  });

  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'] },
    (details, callback) => {
      try {
        const url = new URL(details.url);
        details.requestHeaders['Referer'] = `https://${url.hostname}`;
      } catch (e) {
        details.requestHeaders['Referer'] = 'https://www.youtube.com';
      }
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
