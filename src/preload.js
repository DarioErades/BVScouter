import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // devuelve el foco de teclado a la ventana tras un diálogo nativo (confirm/alert)
  restoreFocus: () => ipcRenderer.invoke('window:restoreFocus'),
  // partidos
  getPartidos: () => ipcRenderer.invoke('partidos:getAll'),
  getPartido: (id) => ipcRenderer.invoke('partidos:getById', id),
  createPartido: (data) => ipcRenderer.invoke('partidos:create', data),
  updatePartido: (id, data) => ipcRenderer.invoke('partidos:update', id, data),
  deletePartido: (id) => ipcRenderer.invoke('partidos:delete', id),
  movePartidoToCarpeta: (partidoId, carpetaId) => ipcRenderer.invoke('partidos:moveToCarpeta', partidoId, carpetaId),
  // jugadores
  getJugadores: () => ipcRenderer.invoke('jugadores:getAll'),
  createJugador: (data) => ipcRenderer.invoke('jugadores:create', data),
  updateJugador: (id, data) => ipcRenderer.invoke('jugadores:update', id, data),
  deleteJugador: (id) => ipcRenderer.invoke('jugadores:delete', id),
  // carpetas
  getCarpetas: () => ipcRenderer.invoke('carpetas:getAll'),
  createCarpeta: (nombre) => ipcRenderer.invoke('carpetas:create', nombre),
  deleteCarpeta: (id) => ipcRenderer.invoke('carpetas:delete', id),
  // acciones
  getAcciones: (partidoId) => ipcRenderer.invoke('acciones:getByPartido', partidoId),
  createAccion: (data) => ipcRenderer.invoke('acciones:create', data),
  updateAccion: (id, data) => ipcRenderer.invoke('acciones:update', id, data),
  deleteAccion: (id) => ipcRenderer.invoke('acciones:delete', id),
  undoLastAccion: (partidoId) => ipcRenderer.invoke('acciones:deleteLastByPartido', partidoId),
  // utilidades
  openVideoFile: () => ipcRenderer.invoke('dialog:openFile'),
  getStats: (partidoId) => ipcRenderer.invoke('stats:getByPartido', partidoId),
  generatePDF: (html, height, opciones) => ipcRenderer.invoke('pdf:generate', html, height, opciones),
  generateVideoHighlights: (partidoId, filters) => ipcRenderer.invoke('video:generateHighlights', partidoId, filters),
  cancelVideoHighlights: () => ipcRenderer.invoke('video:cancel'),
  resolveYoutube: (videoUrl) => ipcRenderer.invoke('video:resolveYoutube', videoUrl),
  analyzeWhistles: (videoPath) => ipcRenderer.invoke('video:analyzeWhistles', videoPath),
  getWhistles: (videoPath) => ipcRenderer.invoke('video:getWhistles', videoPath),
  onWhistleProgress: (callback) => {
    ipcRenderer.removeAllListeners('whistle:progress');
    ipcRenderer.on('whistle:progress', (_event, progress) => callback(progress));
  },
  onVideoProgress: (callback) => {
    ipcRenderer.removeAllListeners('video:progress');
    ipcRenderer.on('video:progress', (_event, progress) => callback(progress));
  },
  onYtProgress: (callback) => {
    ipcRenderer.removeAllListeners('yt:progress');
    ipcRenderer.on('yt:progress', (_event, progress) => callback(progress));
  },
  onVideoDownloading: (callback) => {
    ipcRenderer.removeAllListeners('video:downloading');
    ipcRenderer.on('video:downloading', (_event, progress) => callback(progress));
  },
  clearYoutubeCache: () => ipcRenderer.invoke('video:clearYoutubeCache'),
  // copias de seguridad y exportacion
  backupDatabase: () => ipcRenderer.invoke('db:backup'),
  restoreDatabase: () => ipcRenderer.invoke('db:restore'),
  exportAccionesCSV: (partidoId) => ipcRenderer.invoke('acciones:exportCSV', partidoId),
});

contextBridge.exposeInMainWorld('apiPista', {
  // equipos
  getEquipos: () => ipcRenderer.invoke('pista:equipos:getAll'),
  createEquipo: (data) => ipcRenderer.invoke('pista:equipos:create', data),
  updateEquipo: (id, data) => ipcRenderer.invoke('pista:equipos:update', id, data),
  deleteEquipo: (id) => ipcRenderer.invoke('pista:equipos:delete', id),
  exportRosterForTablet: (equipoId) => ipcRenderer.invoke('pista:equipos:exportRosterForTablet', equipoId),
  importRosterFromTablet: () => ipcRenderer.invoke('pista:equipos:importRosterFromTablet'),
  getDatosAnalisisEquipo: (equipoId) => ipcRenderer.invoke('pista:equipos:getDatosAnalisis', equipoId),
  // jugadores pista
  getJugadoresByEquipo: (equipoId) => ipcRenderer.invoke('pista:jugadores:getByEquipo', equipoId),
  createJugadorPista: (data) => ipcRenderer.invoke('pista:jugadores:create', data),
  updateJugadorPista: (id, data) => ipcRenderer.invoke('pista:jugadores:update', id, data),
  deleteJugadorPista: (id) => ipcRenderer.invoke('pista:jugadores:delete', id),
  // carpetas pista
  getCarpetasPista: () => ipcRenderer.invoke('pista:carpetas:getAll'),
  createCarpetaPista: (nombre) => ipcRenderer.invoke('pista:carpetas:create', nombre),
  deleteCarpetaPista: (id) => ipcRenderer.invoke('pista:carpetas:delete', id),
  // partidos pista
  getPartidosPista: () => ipcRenderer.invoke('pista:partidos:getAll'),
  getPartidoPista: (id) => ipcRenderer.invoke('pista:partidos:getById', id),
  createPartidoPista: (data) => ipcRenderer.invoke('pista:partidos:create', data),
  updatePartidoPista: (id, data) => ipcRenderer.invoke('pista:partidos:update', id, data),
  deletePartidoPista: (id) => ipcRenderer.invoke('pista:partidos:delete', id),
  movePartidoPistaToCarpeta: (partidoId, carpetaId) => ipcRenderer.invoke('pista:partidos:moveToCarpeta', partidoId, carpetaId),
  importPartidoPistaFromTablet: () => ipcRenderer.invoke('pista:partidos:importFromTablet'),
  importarTodoDeTablet: () => ipcRenderer.invoke('pista:partidos:importBulk'),
  // roster
  getRoster: (partidoId) => ipcRenderer.invoke('pista:roster:getByPartido', partidoId),
  addRosterJugador: (data) => ipcRenderer.invoke('pista:roster:addJugador', data),
  updateRosterJugador: (id, data) => ipcRenderer.invoke('pista:roster:updateJugador', id, data),
  removeRosterJugador: (id) => ipcRenderer.invoke('pista:roster:removeJugador', id),
  // acciones pista
  getAccionesPista: (partidoId) => ipcRenderer.invoke('pista:acciones:getByPartido', partidoId),
  createAccionPista: (data) => ipcRenderer.invoke('pista:acciones:create', data),
  updateAccionPista: (id, data) => ipcRenderer.invoke('pista:acciones:update', id, data),
  deleteAccionPista: (id) => ipcRenderer.invoke('pista:acciones:delete', id),
  undoLastAccionPista: (partidoId) => ipcRenderer.invoke('pista:acciones:deleteLastByPartido', partidoId),
  // stats
  getStatsPista: (partidoId) => ipcRenderer.invoke('pista:stats:getByPartido', partidoId),
  // video
  generateVideoHighlightsPista: (partidoId, filters) => ipcRenderer.invoke('pista:video:generateHighlights', partidoId, filters),
  cancelVideoHighlightsPista: () => ipcRenderer.invoke('pista:video:cancel'),
  onVideoProgressPista: (callback) => {
    ipcRenderer.removeAllListeners('pista:video:progress');
    ipcRenderer.on('pista:video:progress', (_event, progress) => callback(progress));
  },
  onYtProgress: (callback) => {
    ipcRenderer.removeAllListeners('yt:progress');
    ipcRenderer.on('yt:progress', (_event, progress) => callback(progress));
  },
  onVideoDownloadingPista: (callback) => {
    ipcRenderer.removeAllListeners('pista:video:downloading');
    ipcRenderer.on('pista:video:downloading', (_event, progress) => callback(progress));
  },
  // db
  backupDatabasePista: () => ipcRenderer.invoke('pista:db:backup'),
  restoreDatabasePista: () => ipcRenderer.invoke('pista:db:restore'),
  // csv
  exportAccionesPistaCSV: (partidoId) => ipcRenderer.invoke('pista:acciones:exportCSV', partidoId),
});
