import { ipcMain, dialog, BrowserWindow, shell, app } from 'electron';
import { getDBPista } from './database.js';
import { exec, execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { descargarYtDlp } from './utils/ytdlp-helper.js';
import { getFfmpegPath } from './utils/ffmpeg-helper.js';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

function pickPista(data, fields) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Datos no válidos');
  return Object.fromEntries(Object.entries(data).filter(([key]) => fields.includes(key)));
}
function cleanPistaText(value, max = 10000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// ---- EQUIPOS PISTA ----
ipcMain.handle('pista:equipos:getAll', () => {
  const db = getDBPista();
  return db.prepare('SELECT * FROM equipos_pista ORDER BY nombre').all();
});

ipcMain.handle('pista:equipos:create', (_event, data) => {
  const db = getDBPista();
  const stmt = db.prepare(`
    INSERT INTO equipos_pista (nombre, abreviatura, notas)
    VALUES (@nombre, @abreviatura, @notas)
  `);
  const completo = { nombre: '', abreviatura: '', notas: '', ...data };
  const result = stmt.run(completo);
  return { id: result.lastInsertRowid, ...completo };
});

ipcMain.handle('pista:equipos:update', (_event, id, data) => {
  const db = getDBPista();
  const safeData = pickPista(data, ['nombre', 'abreviatura', 'notas']);
  Object.keys(safeData).forEach(key => { safeData[key] = cleanPistaText(safeData[key]); });
  const campos = Object.keys(safeData);
  if (campos.length === 0) return true;
  const sets = campos.map(c => `${c} = @${c}`).join(', ');
  const stmt = db.prepare(`UPDATE equipos_pista SET ${sets} WHERE id = @id`);
  return stmt.run({ ...safeData, id });
});

ipcMain.handle('pista:equipos:delete', (_event, id) => {
  const db = getDBPista();
  return db.prepare('DELETE FROM equipos_pista WHERE id = ?').run(id);
});

// ---- JUGADORES PISTA ----
ipcMain.handle('pista:jugadores:getByEquipo', (_event, equipoId) => {
  const db = getDBPista();
  return db.prepare('SELECT * FROM jugadores_pista WHERE equipo_id = ? ORDER BY dorsal').all(equipoId);
});

ipcMain.handle('pista:jugadores:create', (_event, data) => {
  const db = getDBPista();
  const stmt = db.prepare(`
    INSERT INTO jugadores_pista (equipo_id, dorsal, nombre, apellidos, posicion, es_libero)
    VALUES (@equipo_id, @dorsal, @nombre, @apellidos, @posicion, @es_libero)
  `);
  const completo = { nombre: '', apellidos: '', posicion: '', es_libero: 0, ...data };
  const result = stmt.run(completo);
  return { id: result.lastInsertRowid, ...completo };
});

ipcMain.handle('pista:jugadores:update', (_event, id, data) => {
  const db = getDBPista();
  const safeData = pickPista(data, ['dorsal', 'nombre', 'apellidos', 'posicion', 'es_libero', 'activo']);
  ['nombre', 'apellidos', 'posicion'].forEach(key => { if (key in safeData) safeData[key] = cleanPistaText(safeData[key], 160); });
  const campos = Object.keys(safeData);
  if (campos.length === 0) return true;
  const sets = campos.map(c => `${c} = @${c}`).join(', ');
  const stmt = db.prepare(`UPDATE jugadores_pista SET ${sets} WHERE id = @id`);
  return stmt.run({ ...safeData, id });
});

ipcMain.handle('pista:jugadores:delete', (_event, id) => {
  const db = getDBPista();
  return db.prepare('DELETE FROM jugadores_pista WHERE id = ?').run(id);
});

// ---- CARPETAS PISTA ----
ipcMain.handle('pista:carpetas:getAll', () => {
  const db = getDBPista();
  return db.prepare('SELECT * FROM carpetas_pista ORDER BY nombre').all();
});

ipcMain.handle('pista:carpetas:create', (_event, nombre) => {
  const db = getDBPista();
  const stmt = db.prepare('INSERT INTO carpetas_pista (nombre) VALUES (?)');
  const result = stmt.run(nombre);
  return { id: result.lastInsertRowid, nombre };
});

ipcMain.handle('pista:carpetas:delete', (_event, id) => {
  const db = getDBPista();
  db.prepare('UPDATE partidos_pista SET carpeta_id = NULL WHERE carpeta_id = ?').run(id);
  return db.prepare('DELETE FROM carpetas_pista WHERE id = ?').run(id);
});

// ---- PARTIDOS PISTA ----
ipcMain.handle('pista:partidos:getAll', () => {
  const db = getDBPista();
  return db.prepare('SELECT * FROM partidos_pista ORDER BY fecha DESC').all();
});

ipcMain.handle('pista:partidos:getById', (_event, id) => {
  const db = getDBPista();
  return db.prepare('SELECT * FROM partidos_pista WHERE id = ?').get(id);
});

ipcMain.handle('pista:partidos:create', (_event, data) => {
  const db = getDBPista();
  const stmt = db.prepare(`
    INSERT INTO partidos_pista (fecha, torneo, fase, equipo_id, equipo_nombre, rival_nombre, video_tipo, video_url, resultado, resultado_parciales, notas, finalizado, carpeta_id, llevar_rotaciones, rotaciones_iniciales)
    VALUES (@fecha, @torneo, @fase, @equipo_id, @equipo_nombre, @rival_nombre, @video_tipo, @video_url, @resultado, @resultado_parciales, @notas, @finalizado, @carpeta_id, @llevar_rotaciones, @rotaciones_iniciales)
  `);
  const completo = {
    fecha: '', torneo: '', fase: '', equipo_id: null, equipo_nombre: '', rival_nombre: '',
    video_tipo: 'local', video_url: '', resultado: '', resultado_parciales: '', notas: '', finalizado: 0, carpeta_id: null,
    llevar_rotaciones: 0, rotaciones_iniciales: '{}',
    ...data
  };
  const result = stmt.run(completo);
  return result.lastInsertRowid;
});

ipcMain.handle('pista:partidos:update', (_event, id, data) => {
  const db = getDBPista();
  const safeData = pickPista(data, ['fecha', 'torneo', 'fase', 'equipo_id', 'equipo_nombre', 'rival_nombre', 'video_tipo', 'video_url', 'resultado', 'resultado_parciales', 'notas', 'finalizado', 'carpeta_id', 'llevar_rotaciones', 'rotaciones_iniciales']);
  ['fecha', 'torneo', 'fase', 'equipo_nombre', 'rival_nombre', 'video_tipo', 'video_url', 'resultado', 'resultado_parciales', 'notas', 'rotaciones_iniciales'].forEach(key => { if (key in safeData) safeData[key] = cleanPistaText(safeData[key]); });
  const campos = Object.keys(safeData);
  if (campos.length === 0) return true;
  const sets = campos.map(c => `${c} = @${c}`).join(', ');
  const stmt = db.prepare(`UPDATE partidos_pista SET ${sets} WHERE id = @id`);
  return stmt.run({ ...safeData, id });
});

ipcMain.handle('pista:partidos:delete', (_event, id) => {
  const db = getDBPista();
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM acciones_pista WHERE partido_id = ?').run(id);
    db.prepare('DELETE FROM roster_partido WHERE partido_id = ?').run(id);
    db.prepare('DELETE FROM partidos_pista WHERE id = ?').run(id);
  });
  transaction();
  return true;
});

ipcMain.handle('pista:partidos:moveToCarpeta', (_event, partidoId, carpetaId) => {
  const db = getDBPista();
  return db.prepare('UPDATE partidos_pista SET carpeta_id = ? WHERE id = ?').run(carpetaId, partidoId);
});

// ---- ROSTER PISTA ----
ipcMain.handle('pista:roster:getByPartido', (_event, partidoId) => {
  const db = getDBPista();
  return db.prepare('SELECT * FROM roster_partido WHERE partido_id = ? ORDER BY dorsal').all(partidoId);
});

ipcMain.handle('pista:roster:addJugador', (_event, data) => {
  const db = getDBPista();
  const stmt = db.prepare(`
    INSERT INTO roster_partido (partido_id, dorsal, nombre, apellidos, posicion, es_libero, jugador_pista_id)
    VALUES (@partido_id, @dorsal, @nombre, @apellidos, @posicion, @es_libero, @jugador_pista_id)
  `);
  const completo = { nombre: '', apellidos: '', posicion: '', es_libero: 0, jugador_pista_id: null, ...data };
  const result = stmt.run(completo);
  return { id: result.lastInsertRowid, ...completo };
});

ipcMain.handle('pista:roster:updateJugador', (_event, id, data) => {
  const db = getDBPista();
  const campos = Object.keys(data);
  if (campos.length === 0) return true;
  const sets = campos.map(c => `${c} = @${c}`).join(', ');
  const stmt = db.prepare(`UPDATE roster_partido SET ${sets} WHERE id = @id`);
  return stmt.run({ ...data, id });
});

ipcMain.handle('pista:roster:removeJugador', (_event, id) => {
  const db = getDBPista();
  return db.prepare('DELETE FROM roster_partido WHERE id = ?').run(id);
});

// ---- ACCIONES PISTA ----
ipcMain.handle('pista:acciones:getByPartido', (_event, partidoId) => {
  const db = getDBPista();
  return db.prepare('SELECT * FROM acciones_pista WHERE partido_id = ? ORDER BY id').all(partidoId);
});

ipcMain.handle('pista:acciones:create', (_event, data) => {
  const db = getDBPista();
  const stmt = db.prepare(`
    INSERT INTO acciones_pista (partido_id, dorsal, rotacion, tipo_accion, subtipo, resultado, set_numero, marcador_local, marcador_rival, marcador_pre_local, marcador_pre_rival, equipo_al_saque, scouting_version, video_timestamp, zona_origen, zona_destino, es_favorito)
    VALUES (@partido_id, @dorsal, @rotacion, @tipo_accion, @subtipo, @resultado, @set_numero, @marcador_local, @marcador_rival, @marcador_pre_local, @marcador_pre_rival, @equipo_al_saque, @scouting_version, @video_timestamp, @zona_origen, @zona_destino, @es_favorito)
  `);
  const result = stmt.run({ marcador_pre_local: data.marcador_local ?? '0', marcador_pre_rival: data.marcador_rival ?? '0', equipo_al_saque: data.equipo_al_saque || 'local', scouting_version: 2, ...data, es_favorito: data.es_favorito ? 1 : 0 });
  return result.lastInsertRowid;
});

ipcMain.handle('pista:acciones:update', (_event, id, data) => {
  const db = getDBPista();
  const allowed = new Set(['dorsal', 'rotacion', 'tipo_accion', 'subtipo', 'resultado', 'set_numero', 'marcador_local', 'marcador_rival', 'marcador_pre_local', 'marcador_pre_rival', 'equipo_al_saque', 'scouting_version', 'video_timestamp', 'zona_origen', 'zona_destino', 'es_favorito']);
  const safeData = Object.fromEntries(Object.entries(data).filter(([key]) => allowed.has(key)));
  const campos = Object.keys(safeData);
  if (campos.length === 0) return true;
  const sets = campos.map(c => `${c} = @${c}`).join(', ');
  const stmt = db.prepare(`UPDATE acciones_pista SET ${sets} WHERE id = @id`);
  return stmt.run({ ...safeData, id });
});

ipcMain.handle('pista:acciones:delete', (_event, id) => {
  const db = getDBPista();
  return db.prepare('DELETE FROM acciones_pista WHERE id = ?').run(id);
});

ipcMain.handle('pista:acciones:deleteLastByPartido', (_event, partidoId) => {
  const db = getDBPista();
  const last = db.prepare('SELECT id FROM acciones_pista WHERE partido_id = ? ORDER BY id DESC LIMIT 1').get(partidoId);
  if (last) {
    db.prepare('DELETE FROM acciones_pista WHERE id = ?').run(last.id);
    return last.id;
  }
  return null;
});

// ---- STATS PISTA ----
ipcMain.handle('pista:stats:getByPartido', (_event, partidoId) => {
  const db = getDBPista();
  const acciones = db.prepare('SELECT * FROM acciones_pista WHERE partido_id = ?').all(partidoId);
  const stats = {};
  
  acciones.forEach(a => {
    if (!stats[a.dorsal]) {
      stats[a.dorsal] = {
        saque: { total: 0, errores: 0, puntos: 0 },
        recepcion: { total: 0, errores: 0, positivas: 0, excelentes: 0 },
        ataque: { total: 0, errores: 0, bloqueados: 0, puntos: 0 },
        bloqueo: { puntos: 0 },
        defensa: { total: 0, errores: 0 }
      };
    }
    const p = stats[a.dorsal];
    if (a.tipo_accion === 'saque') {
      p.saque.total++;
      if (a.resultado === '=') p.saque.errores++;
      if (a.resultado === '#') p.saque.puntos++;
    } else if (a.tipo_accion === 'recepcion') {
      p.recepcion.total++;
      if (a.resultado === '=') p.recepcion.errores++;
      if (a.resultado === '+') p.recepcion.positivas++;
      if (a.resultado === '#') p.recepcion.excelentes++;
    } else if (a.tipo_accion === 'ataque') {
      p.ataque.total++;
      if (a.resultado === '=') p.ataque.errores++;
      if (a.resultado === '/') p.ataque.bloqueados++;
      if (a.resultado === '#') p.ataque.puntos++;
    } else if (a.tipo_accion === 'bloqueo') {
      if (a.resultado === '#') p.bloqueo.puntos++;
    } else if (a.tipo_accion === 'defensa') {
      p.defensa.total++;
      if (a.resultado === '=') p.defensa.errores++;
    }
  });

  const totalsOverall = {
    saque: { total: 0, errores: 0, puntos: 0 },
    recepcion: { total: 0, errores: 0, positivas: 0, excelentes: 0 },
    ataque: { total: 0, errores: 0, bloqueados: 0, puntos: 0 },
    bloqueo: { puntos: 0 },
    defensa: { total: 0, errores: 0 }
  };
  
  const totalsSet = {};

  acciones.forEach(a => {
    if (!totalsSet[a.set_numero]) {
      totalsSet[a.set_numero] = {
        saque: { total: 0, errores: 0, puntos: 0 },
        recepcion: { total: 0, errores: 0, positivas: 0, excelentes: 0 },
        ataque: { total: 0, errores: 0, bloqueados: 0, puntos: 0 },
        bloqueo: { puntos: 0 },
        defensa: { total: 0, errores: 0 }
      };
    }
    const t = totalsSet[a.set_numero];
    const o = totalsOverall;

    if (a.tipo_accion === 'saque') {
      t.saque.total++; o.saque.total++;
      if (a.resultado === '=') { t.saque.errores++; o.saque.errores++; }
      if (a.resultado === '#') { t.saque.puntos++; o.saque.puntos++; }
    } else if (a.tipo_accion === 'recepcion') {
      t.recepcion.total++; o.recepcion.total++;
      if (a.resultado === '=') { t.recepcion.errores++; o.recepcion.errores++; }
      if (a.resultado === '+') { t.recepcion.positivas++; o.recepcion.positivas++; }
      if (a.resultado === '#') { t.recepcion.excelentes++; o.recepcion.excelentes++; }
    } else if (a.tipo_accion === 'ataque') {
      t.ataque.total++; o.ataque.total++;
      if (a.resultado === '=') { t.ataque.errores++; o.ataque.errores++; }
      if (a.resultado === '/') { t.ataque.bloqueados++; o.ataque.bloqueados++; }
      if (a.resultado === '#') { t.ataque.puntos++; o.ataque.puntos++; }
    } else if (a.tipo_accion === 'bloqueo') {
      if (a.resultado === '#') { t.bloqueo.puntos++; o.bloqueo.puntos++; }
    } else if (a.tipo_accion === 'defensa') {
      t.defensa.total++; o.defensa.total++;
      if (a.resultado === '=') { t.defensa.errores++; o.defensa.errores++; }
    }
  });

  return { byDorsal: stats, totalsSet, totalsOverall };
});

// ---- DB BACKUP/RESTORE PISTA ----
ipcMain.handle('pista:db:backup', async () => {
  const db = getDBPista();
  const fecha = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar copia de seguridad (Pista)',
    defaultPath: `bvscouter_pista_backup_${fecha}.db`,
    filters: [{ name: 'Base de datos BVScouter Pista', extensions: ['db'] }]
  });
  if (canceled || !filePath) return null;
  await db.backup(filePath);
  return filePath;
});

ipcMain.handle('pista:db:restore', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Seleccionar copia de seguridad (Pista)',
    filters: [{ name: 'Base de datos BVScouter Pista', extensions: ['db'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const backupPath = result.filePaths[0];
  const db = getDBPista();
  const dbPath = db.name;

  db.close();
  fs.copyFileSync(backupPath, dbPath);
  try { if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal'); } catch (e) {}
  try { if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm'); } catch (e) {}

  app.relaunch();
  app.exit(0);
  return true;
});

// ---- VIDEO PISTA ----
const ytCache = new Map();

async function resolverVideoPath(partido, onProgress) {
  if (partido.video_tipo === 'local') {
    if (!fs.existsSync(partido.video_url)) {
      throw new Error('El archivo de vídeo original no existe.');
    }
    return partido.video_url;
  }

  if (partido.video_tipo === 'youtube') {
    if (ytCache.has(partido.video_url) && fs.existsSync(ytCache.get(partido.video_url))) {
      return ytCache.get(partido.video_url);
    }

    const tmpDir = path.join(os.tmpdir(), 'bvscouter_yt');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const safeId = partido.video_url.replace(/[^a-zA-Z0-9]/g, '_').slice(-60);
    const outputPath = path.join(tmpDir, `${safeId}.mp4`);

    if (fs.existsSync(outputPath)) {
      ytCache.set(partido.video_url, outputPath);
      return outputPath;
    }

    await descargarYtDlp(outputPath, partido.video_url, onProgress);

    ytCache.set(partido.video_url, outputPath);
    return outputPath;
  }

  throw new Error('Tipo de vídeo no soportado para generar highlights.');
}

ipcMain.handle('pista:video:generateHighlights', async (_event, partidoId, filters) => {
  const db = getDBPista();
  
  const partido = db.prepare('SELECT video_url, video_tipo FROM partidos_pista WHERE id = ?').get(partidoId);
  if (!partido || !partido.video_url || (partido.video_tipo !== 'local' && partido.video_tipo !== 'youtube')) {
    throw new Error('El partido no tiene un vídeo válido configurado.');
  }

  const videoPath = await resolverVideoPath(partido);

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar Vídeo',
    defaultPath: `video_pista_${partidoId}.mp4`,
    filters: [
      { name: 'Vídeo MP4', extensions: ['mp4'] }
    ]
  });

  if (canceled || !filePath) return null;

  let query = 'SELECT id, video_timestamp, marcador_local, marcador_rival, set_numero, tipo_accion, subtipo, resultado, dorsal, rotacion FROM acciones_pista WHERE partido_id = ? AND video_timestamp > 0';
  const params = [partidoId];

  if (filters.set_numero) {
    query += ' AND set_numero = ?';
    params.push(parseInt(filters.set_numero, 10));
  }

  if (filters.modo === 'favoritos') {
    query += ' AND es_favorito = 1';
  } else if (filters.modo !== 'puntos') {
    if (filters.dorsal) {
      query += ' AND dorsal = ?';
      params.push(parseInt(filters.dorsal, 10));
    }
    if (filters.tipo_accion) {
      query += ' AND tipo_accion = ?';
      params.push(filters.tipo_accion);
    }
    if (filters.resultado) {
      query += ' AND resultado = ?';
      params.push(filters.resultado);
    }
  }
  
  query += ' ORDER BY video_timestamp ASC';

  let acciones = db.prepare(query).all(...params);

  // Para "punto completo cuando ataque un jugador" primero encontramos los
  // ataques del jugador y después recuperamos todas las acciones de los
  // rallies que contienen uno de esos ataques.
  if (filters.modo === 'puntos_ataques') {
    const selectedIds = new Set(acciones.map(a => a.id));
    let allQuery = 'SELECT id, video_timestamp, marcador_local, marcador_rival, set_numero, tipo_accion, subtipo, resultado, dorsal, rotacion FROM acciones_pista WHERE partido_id = ? AND video_timestamp > 0';
    const allParams = [partidoId];
    if (filters.set_numero) {
      allQuery += ' AND set_numero = ?';
      allParams.push(parseInt(filters.set_numero, 10));
    }
    const allAcciones = db.prepare(allQuery + ' ORDER BY id ASC').all(...allParams);
    const rallies = [];
    let rally = [];
    const isTerminal = (a) => {
      if (['tiempo_muerto', 'cambio'].includes(a.tipo_accion)) return false;
      if (a.tipo_accion === 'rival' || a.tipo_accion === 'error_general') return true;
      if (['recepcion', 'defensa', 'colocacion', 'freeball'].includes(a.tipo_accion)) return a.resultado === '=';
      return ['#', '=', '/'].includes(a.resultado);
    };
    allAcciones.forEach(a => {
      rally.push(a);
      if (isTerminal(a)) {
        rallies.push(rally);
        rally = [];
      }
    });
    if (rally.length) rallies.push(rally);
    acciones = rallies.filter(group => group.some(a => selectedIds.has(a.id))).flat();
  }
  
  if (acciones.length === 0) {
    throw new Error('No se encontraron acciones con esos filtros que tengan un tiempo de vídeo registrado.');
  }

  const preMargin = filters.pre_margin !== undefined ? parseFloat(filters.pre_margin) : 3;
  const postMargin = filters.post_margin !== undefined ? parseFloat(filters.post_margin) : 1;

  let intervals = [];

  if (filters.modo === 'puntos' || filters.modo === 'favoritos' || filters.modo === 'puntos_ataques') {
    const grupos = {};
    if (filters.modo === 'puntos' || filters.modo === 'puntos_ataques') {
      const isTerminal = (a) => {
        if (['tiempo_muerto', 'cambio'].includes(a.tipo_accion)) return false;
        if (a.tipo_accion === 'rival' || a.tipo_accion === 'error_general') return true;
        if (['recepcion', 'defensa', 'colocacion', 'freeball'].includes(a.tipo_accion)) return a.resultado === '=';
        return ['#', '=', '/'].includes(a.resultado);
      };
      const rallies = [];
      let rally = [];
      [...acciones].sort((a, b) => a.id - b.id).forEach(a => {
        rally.push(a);
        if (isTerminal(a)) {
          rallies.push(rally);
          rally = [];
        }
      });
      if (rally.length) rallies.push(rally);
      rallies.forEach((group, index) => { grupos[index] = { acciones: group }; });
    } else {
      acciones.forEach(a => {
        const key = `${a.set_numero}_${a.marcador_local}_${a.marcador_rival}`;
        if (!grupos[key]) grupos[key] = { acciones: [] };
        grupos[key].acciones.push(a);
      });
    }

    intervals = Object.values(grupos).map(g => {
      g.acciones.sort((x, y) => x.video_timestamp - y.video_timestamp);
      
      const primera = g.acciones[0];
      const ultima = g.acciones[g.acciones.length - 1];
      
      const extraMargin = (primera && primera.tipo_accion === 'recepcion') ? 1.0 : 0.0;
      const actualPreMargin = preMargin + extraMargin;
      
      return {
        start: Math.max(0, (primera.video_timestamp - actualPreMargin)),
        end: (ultima.video_timestamp + postMargin),
        score: `${primera.marcador_local || 0} - ${primera.marcador_rival || 0}`,
        acciones: g.acciones
      };
    });
  } else {
    const grupos = {};
    acciones.forEach(a => {
      const key = `${a.set_numero}_${a.marcador_local}_${a.marcador_rival}`;
      if (!grupos[key]) {
        grupos[key] = {
          minTime: a.video_timestamp,
          maxTime: a.video_timestamp,
          score: `${a.marcador_local || 0} - ${a.marcador_rival || 0}`,
          acciones: [a]
        };
      } else {
        grupos[key].minTime = Math.min(grupos[key].minTime, a.video_timestamp);
        grupos[key].maxTime = Math.max(grupos[key].maxTime, a.video_timestamp);
        grupos[key].acciones.push(a);
      }
    });

    intervals = Object.values(grupos).map(g => ({
      start: Math.max(0, g.minTime - preMargin),
      end: g.maxTime + postMargin,
      score: g.score,
      acciones: g.acciones
    }));
  }
  
  // En el modo "puntos" cada intervalo representa un rally completo. No los
  // fusionamos aunque los márgenes se solapen: hacerlo convierte varios
  // puntos consecutivos en un único clip (a veces, en todo el partido) y
  // conserva el marcador del primer punto para todo el vídeo fusionado.
  if (intervals.length > 0 && !['puntos', 'puntos_ataques'].includes(filters.modo)) {
      intervals.sort((a, b) => a.start - b.start);
      const merged = [intervals[0]];
      for (let i = 1; i < intervals.length; i++) {
          const last = merged[merged.length - 1];
          const curr = intervals[i];
          if (curr.start <= last.end) {
              last.end = Math.max(last.end, curr.end);
              last.acciones = (last.acciones || []).concat(curr.acciones || []);
          } else {
              merged.push(curr);
          }
      }
      intervals = merged;
  }

  let hasAudio = false;
  try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-select_streams', 'a',
        '-show_entries', 'stream=index',
        '-of', 'csv=p=0',
        videoPath
      ]);
      hasAudio = stdout.trim().length > 0;
  } catch(e) {}

  const filterFilePath = path.join(os.tmpdir(), `bvscouter_pista_filter_${Date.now()}.txt`);
  let filterGraph = '';
  let concatInputs = '';

  const RESULT_ICONS = { '#': '● PUNTO', '=': '✕ ERROR', '/': '✕ BLOQ', '+': '→ B+', '-': '· B-', '!': '· EX' };
  const buildActionLines = (accs) => {
      const orden = [...(accs || [])].sort((a, b) => a.video_timestamp - b.video_timestamp);
      return orden
        .filter(a => a.tipo_accion !== 'fin_set')
        .slice(0, 8)
        .map(a => {
            const tipo = (a.tipo_accion || '').charAt(0).toUpperCase() + (a.tipo_accion || '').slice(1);
            const sub = a.subtipo ? ` ${a.subtipo}` : '';
            const res = RESULT_ICONS[a.resultado] || (a.resultado || '');
            const jugador = `[${a.dorsal}] · `;
            return ` ${jugador}${tipo}${sub}  ${res} `;
        });
  };

  const mostrarAcciones = !!filters.mostrar_acciones;
  const textFiles = [];
  const sessionId = Date.now();
  
  let ffmpegArgs = ['-y'];

  intervals.forEach((interval, i) => {
      const duration = interval.end - interval.start;
      ffmpegArgs.push('-ss', interval.start.toFixed(3), '-t', duration.toFixed(3), '-i', videoPath);

      const text = ` ${interval.score} `;
      const conMarcador = filters.con_marcador !== false;
      let vFilters = ['setpts=PTS-STARTPTS'];

      if (conMarcador) {
          vFilters.push(`drawtext=text='${text}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.6:boxborderw=15:x=w-tw-30:y=30`);
      }

      if (mostrarAcciones) {
          const lines = buildActionLines(interval.acciones);
          if (lines.length > 0) {
              const txtPath = path.join(os.tmpdir(), `bvscouter_pista_card_${sessionId}_${i}.txt`);
              fs.writeFileSync(txtPath, lines.join('\n'));
              textFiles.push(txtPath);
              vFilters.push(`drawtext=textfile=${txtPath}:expansion=none:fontcolor=white:fontsize=26:line_spacing=10:box=1:boxcolor=black@0.65:boxborderw=14:x=30:y=h-th-40`);
          }
      }

      filterGraph += `[${i}:v]${vFilters.join(',')}[v${i}];\n`;
      
      if (hasAudio) {
          filterGraph += `[${i}:a]asetpts=PTS-STARTPTS[a${i}];\n`;
          concatInputs += `[v${i}][a${i}]`;
      } else {
          concatInputs += `[v${i}]`;
      }
  });
  
  filterGraph += `${concatInputs}concat=n=${intervals.length}:v=1:a=${hasAudio ? 1 : 0}[outv]${hasAudio ? '[outa]' : ''}`;
  
  fs.writeFileSync(filterFilePath, filterGraph);
  
  try {
      ffmpegArgs.push('-filter_complex_script', filterFilePath, '-map', '[outv]');
      if (hasAudio) {
          ffmpegArgs.push('-map', '[outa]');
      }
      ffmpegArgs.push('-preset', 'superfast', filePath);
      
      const totalDuration = intervals.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
      
      await new Promise((resolve, reject) => {
          const ffmpeg = spawn(getFfmpegPath(), ffmpegArgs);
          
          ffmpeg.stderr.on('data', (data) => {
              const str = data.toString();
              const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
              if (timeMatch) {
                  const hours = parseInt(timeMatch[1], 10);
                  const minutes = parseInt(timeMatch[2], 10);
                  const seconds = parseFloat(timeMatch[3]);
                  const currentTime = (hours * 3600) + (minutes * 60) + seconds;
                  
                  if (totalDuration > 0) {
                      let pct = Math.round((currentTime / totalDuration) * 100);
                      if (pct > 100) pct = 100;
                      _event.sender.send('pista:video:progress', pct);
                  }
              }
          });
          
          ffmpeg.on('close', (code) => {
              if (code === 0) resolve();
              else reject(new Error('FFmpeg exited con código ' + code));
          });
          ffmpeg.on('error', reject);
      });
      
      _event.sender.send('pista:video:progress', 100);
      shell.openPath(filePath);
      return filePath;
  } catch (err) {
      console.error('Error con FFmpeg (Pista):', err);
      throw new Error('Fallo al generar el vídeo. FFmpeg no pudo procesarlo.');
  } finally {
      if (fs.existsSync(filterFilePath)) fs.unlinkSync(filterFilePath);
      textFiles.forEach(f => {
          try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
      });
  }
});

// ---- EXPORTAR ACCIONES A CSV ----
ipcMain.handle('pista:acciones:exportCSV', async (_event, partidoId) => {
  const db = getDBPista();
  const partido = db.prepare('SELECT * FROM partidos_pista WHERE id = ?').get(partidoId);
  if (!partido) throw new Error('Partido no encontrado.');

  const acciones = db.prepare('SELECT * FROM acciones_pista WHERE partido_id = ? ORDER BY id').all(partidoId);
  if (acciones.length === 0) throw new Error('El partido no tiene acciones registradas.');

  const nombre = `${partido.equipo_nombre}_vs_${partido.rival_nombre}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar acciones (Pista) a CSV',
    defaultPath: `acciones_pista_${nombre}_${partido.fecha || partidoId}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (canceled || !filePath) return null;

  const cols = ['id', 'set_numero', 'marcador_local', 'marcador_rival', 'dorsal', 'rotacion', 'tipo_accion', 'subtipo', 'resultado', 'zona_origen', 'zona_destino', 'video_timestamp', 'es_favorito', 'created_at'];
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(';')];
  acciones.forEach(a => lines.push(cols.map(c => escape(a[c])).join(';')));

  fs.writeFileSync(filePath, '\ufeff' + lines.join('\n'), 'utf8');
  return filePath;
});
