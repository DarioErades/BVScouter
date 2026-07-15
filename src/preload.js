import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
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
  generatePDF: (html, height) => ipcRenderer.invoke('pdf:generate', html, height),
  generateVideoHighlights: (partidoId, filters) => ipcRenderer.invoke('video:generateHighlights', partidoId, filters),
  onVideoProgress: (callback) => {
    ipcRenderer.removeAllListeners('video:progress');
    ipcRenderer.on('video:progress', (_event, progress) => callback(progress));
  },
  // copias de seguridad y exportacion
  backupDatabase: () => ipcRenderer.invoke('db:backup'),
  restoreDatabase: () => ipcRenderer.invoke('db:restore'),
  exportAccionesCSV: (partidoId) => ipcRenderer.invoke('acciones:exportCSV', partidoId),
});
