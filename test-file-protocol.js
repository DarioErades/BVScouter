const { app, protocol } = require('electron');
app.whenReady().then(() => {
  console.log(typeof protocol.registerFileProtocol);
  app.quit();
});
