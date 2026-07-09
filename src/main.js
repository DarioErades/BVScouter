import { app, BrowserWindow, ipcMain, dialog, protocol, net, session } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import http from 'node:http';
import fs from 'node:fs';
import { initDatabase } from './database.js';
import './ipc-handlers.js';

// pa manejar shortcuts en Windows al instalar/desinstalar
if (started) {
  app.quit();
}

app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');

// Forzamos un User-Agent de Chrome estándar de Linux para que YouTube no detecte "Electron" y bloquee el reproductor
app.userAgentFallback = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

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

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE] (${level}) ${message} at ${sourceId}:${line}`);
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    // Levantamos un servidor local HTTP en produccion para servir los archivos de la app
    // Esto es necesario para que la API del reproductor de YouTube no de errores de CORS/postMessage (Error 152-4)
    const server = http.createServer((req, res) => {
      let filePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}`, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        const ext = path.extname(filePath);
        const contentType = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.json': 'application/json',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
        }[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      mainWindow.loadURL(`http://localhost:${port}/`);
    });
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
