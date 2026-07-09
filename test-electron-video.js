const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-video', privileges: { standard: true, secure: true, bypassCSP: true, supportFetchAPI: true, stream: true } }
]);

app.whenReady().then(() => {
  protocol.registerFileProtocol('local-video', (request, callback) => {
    const parsedUrl = new URL(request.url);
    const filePath = parsedUrl.searchParams.get('path');
    callback({ path: filePath });
  });

  const win = new BrowserWindow({ webPreferences: { nodeIntegration: true, contextIsolation: false } });
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log('RENDERER:', message);
  });
  win.loadURL('data:text/html,' + encodeURIComponent(`
    <html>
    <body>
      <h1>Test Video</h1>
      <video autoplay controls width="800" src="local-video://video?path=${encodeURIComponent('/home/dario/Descargas/11 de abril de 2026.mp4')}"></video>
      <script>
        const video = document.querySelector('video');
        video.onerror = () => console.error('Video Error:', video.error.message || video.error.code);
        video.onloadedmetadata = () => console.log('Metadata loaded, duration:', video.duration);
      </script>
    </body>
    </html>
  `));
  setTimeout(() => app.quit(), 3000);
});
