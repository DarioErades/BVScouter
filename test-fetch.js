const { app } = require('electron');
const { net } = require('electron');
const { pathToFileURL } = require('url');

app.whenReady().then(async () => {
  const fileUrl = pathToFileURL('/run/media/dario/FEDORA-WS-L/VIDEO/20260708_184649.MOV').toString();
  const res = await net.fetch(fileUrl);
  console.log('Content-Type:', res.headers.get('content-type'));
  app.quit();
});
