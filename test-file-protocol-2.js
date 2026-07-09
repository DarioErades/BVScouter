const { app, protocol } = require('electron');
app.whenReady().then(() => {
  protocol.registerFileProtocol('local-video', (request, callback) => {
    callback({ path: '/run/media/dario/FEDORA-WS-L/VIDEO/20260708_184649.MOV' });
  });
  console.log("protocol registered");
  app.quit();
});
