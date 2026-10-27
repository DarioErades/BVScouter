import { ipcMain, dialog, BrowserWindow, shell, app } from 'electron';
import { getDBPista } from './database.js';
import { exec, execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { descargarYtDlp } from './utils/ytdlp-helper.js';
import { getFfmpegPath, tieneAudio } from './utils/ffmpeg-helper.js';
import { resumirRallies, siguientePunto } from './utils/rallies-pista.js';
import { buscarEquipoCoincidente } from './utils/equipos-vinculo-pista.js';
import { randomUUID } from 'node:crypto';

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

// Del nombre de posición al código corto que usa la app de tablet (S/OP/MB/OH/L).
const POS_A_CODIGO = { colocador: 'S', opuesto: 'OP', central: 'MB', receptor: 'OH', 'líbero': 'L', libero: 'L' };

ipcMain.handle('pista:equipos:exportRosterForTablet', async (_event, equipoId) => {
  const db = getDBPista();
  const equipo = db.prepare('SELECT * FROM equipos_pista WHERE id = ?').get(equipoId);
  if (!equipo) throw new Error('Equipo no encontrado.');
  const jugadores = db.prepare('SELECT * FROM jugadores_pista WHERE equipo_id = ? AND activo = 1 ORDER BY dorsal').all(equipoId);

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar plantilla para VolleyStats Tablet',
    defaultPath: `plantilla_${equipo.nombre}.json`.replace(/[^\w.-]+/g, '_'),
    filters: [{ name: 'Plantilla (JSON)', extensions: ['json'] }]
  });
  if (canceled || !filePath) return null;

  // Id estable del equipo: la tablet lo conserva y lo devuelve en cada partido exportado, así el
  // escritorio sabe de qué equipo es sin depender del nombre.
  let vinculo = db.prepare("SELECT uid FROM equipos_vinculos_pista WHERE equipo_id = ? AND uid LIKE 'pc-%'").get(equipoId);
  if (!vinculo) {
    vinculo = { uid: `pc-${randomUUID()}` };
    db.prepare('INSERT INTO equipos_vinculos_pista (uid, equipo_id) VALUES (?, ?)').run(vinculo.uid, equipoId);
  }

  const payload = {
    format: 'volleystats-roster', version: 1, exportedAt: new Date().toISOString(),
    team: equipo.nombre, teamUid: vinculo.uid,
    roster: jugadores.map(j => ({
      dorsal: j.dorsal, name: [j.nombre, j.apellidos].filter(Boolean).join(' ').trim(),
      pos: j.es_libero ? 'L' : (POS_A_CODIGO[(j.posicion || '').trim().toLowerCase()] || 'OH')
    }))
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return filePath;
});

const CODIGO_A_POS = { S: 'Colocador', OP: 'Opuesto', MB: 'Central', OH: 'Receptor', L: 'Líbero' };

ipcMain.handle('pista:equipos:importRosterFromTablet', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Importar plantilla desde VolleyStats Tablet',
    filters: [{ name: 'Plantilla (JSON)', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths?.length) return null;

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (payload?.format !== 'volleystats-roster' || !Array.isArray(payload.roster)) {
    throw new Error('Ese archivo no es una plantilla de VolleyStats Tablet.');
  }

  const db = getDBPista();
  const nombre = cleanPistaText(payload.team || 'Equipo importado', 160) || 'Equipo importado';
  const uidEquipo = cleanPistaText(payload.teamUid, 80);
  const vinculado = uidEquipo && db.prepare('SELECT e.id, e.nombre FROM equipos_vinculos_pista v JOIN equipos_pista e ON e.id = v.equipo_id WHERE v.uid = ?').get(uidEquipo);
  if (vinculado) return { id: vinculado.id, nombre: vinculado.nombre };
  const equipoStmt = db.prepare('INSERT INTO equipos_pista (nombre, abreviatura, notas) VALUES (@nombre, @abreviatura, @notas)');
  const equipoResult = equipoStmt.run({ nombre, abreviatura: '', notas: '' });
  const equipoId = equipoResult.lastInsertRowid;

  const jugadorStmt = db.prepare(`
    INSERT INTO jugadores_pista (equipo_id, dorsal, nombre, apellidos, posicion, es_libero)
    VALUES (@equipo_id, @dorsal, @nombre, @apellidos, @posicion, @es_libero)
  `);
  for (const j of payload.roster) {
    const esLibero = j.pos === 'L' ? 1 : 0;
    jugadorStmt.run({
      equipo_id: equipoId,
      dorsal: Number.isFinite(j.dorsal) ? j.dorsal : null,
      nombre: cleanPistaText(j.name, 160) || 'Jugador',
      apellidos: '',
      posicion: CODIGO_A_POS[j.pos] || 'Receptor',
      es_libero: esLibero
    });
  }
  if (uidEquipo) db.prepare("INSERT OR IGNORE INTO equipos_vinculos_pista (uid, equipo_id) VALUES (?, ?)").run(uidEquipo, equipoId);
  return { id: equipoId, nombre };
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
  const safeData = pickPista(data, ['fecha', 'torneo', 'fase', 'equipo_id', 'equipo_nombre', 'rival_nombre', 'video_tipo', 'video_url', 'resultado', 'resultado_parciales', 'notas', 'finalizado', 'carpeta_id', 'llevar_rotaciones', 'rotaciones_iniciales', 'calidad_ignorados']);
  ['fecha', 'torneo', 'fase', 'equipo_nombre', 'rival_nombre', 'video_tipo', 'video_url', 'resultado', 'resultado_parciales', 'notas', 'rotaciones_iniciales', 'calidad_ignorados'].forEach(key => { if (key in safeData) safeData[key] = cleanPistaText(safeData[key]); });
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

// Inserta una acción calculando su número de punto y quién sacaba al empezarlo (si no vienen dados).
function insertarAccionPista(db, data) {
  const stmt = db.prepare(`
    INSERT INTO acciones_pista (partido_id, dorsal, rotacion, tipo_accion, subtipo, resultado, set_numero, marcador_local, marcador_rival, marcador_pre_local, marcador_pre_rival, equipo_al_saque, punto_num, saque_inicio, scouting_version, video_timestamp, zona_origen, zona_destino, es_favorito)
    VALUES (@partido_id, @dorsal, @rotacion, @tipo_accion, @subtipo, @resultado, @set_numero, @marcador_local, @marcador_rival, @marcador_pre_local, @marcador_pre_rival, @equipo_al_saque, @punto_num, @saque_inicio, @scouting_version, @video_timestamp, @zona_origen, @zona_destino, @es_favorito)
  `);
  const base = {
    marcador_pre_local: data.marcador_local ?? '0', marcador_pre_rival: data.marcador_rival ?? '0',
    equipo_al_saque: data.equipo_al_saque || 'local', scouting_version: 2,
    subtipo: '', video_timestamp: 0, zona_origen: 0, zona_destino: 0, rotacion: 1,
    ...data
  };
  if (base.tipo_accion === 'fin_set') {
    base.punto_num = base.punto_num ?? null;
    base.saque_inicio = base.saque_inicio ?? null;
  } else if (base.punto_num == null || base.saque_inicio == null) {
    const previas = db.prepare('SELECT * FROM acciones_pista WHERE partido_id = ? AND set_numero = ? ORDER BY id').all(base.partido_id, base.set_numero ?? 1);
    const sig = siguientePunto(previas, base.equipo_al_saque);
    base.punto_num = base.punto_num ?? sig.punto_num;
    base.saque_inicio = base.saque_inicio ?? sig.saque_inicio;
  }
  return stmt.run({ ...base, es_favorito: base.es_favorito ? 1 : 0 }).lastInsertRowid;
}

ipcMain.handle('pista:acciones:create', (_event, data) => insertarAccionPista(getDBPista(), data));

ipcMain.handle('pista:acciones:update', (_event, id, data) => {
  const db = getDBPista();
  const allowed = new Set(['dorsal', 'rotacion', 'tipo_accion', 'subtipo', 'resultado', 'set_numero', 'marcador_local', 'marcador_rival', 'marcador_pre_local', 'marcador_pre_rival', 'equipo_al_saque', 'punto_num', 'saque_inicio', 'scouting_version', 'video_timestamp', 'zona_origen', 'zona_destino', 'es_favorito']);
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

// ---- IMPORTAR PARTIDOS DE LA TABLET ----
// Formatos exportados por VolleyStats Tablet (tablet/www/js/stats.js): un partido
// ('volleystats-tablet') o todos a la vez ('volleystats-tablet-bulk'). Cada partido trae su roster
// y las acciones ya en las columnas de acciones_pista. El equipo se reconoce por el id que le dio
// la tablet, por el nombre o por la plantilla (ver equipos-vinculo-pista.js), así los partidos de
// distintas tablets acaban en el mismo equipo y se pueden analizar juntos.
function contextoImportacion(db) {
  const jugadores = db.prepare('SELECT equipo_id, dorsal, nombre, apellidos FROM jugadores_pista').all();
  const equipos = db.prepare('SELECT * FROM equipos_pista').all().map(e => ({
    ...e,
    jugadores: jugadores.filter(j => j.equipo_id === e.id).map(j => ({ dorsal: j.dorsal, nombre: [j.nombre, j.apellidos].filter(Boolean).join(' ') }))
  }));
  const vinculos = new Map(db.prepare('SELECT uid, equipo_id FROM equipos_vinculos_pista').all().map(v => [v.uid, v.equipo_id]));
  return { equipos, vinculos };
}

function vincularEquipo(db, ctx, uid, equipoId) {
  if (!uid || ctx.vinculos.has(uid)) return;
  db.prepare('INSERT OR IGNORE INTO equipos_vinculos_pista (uid, equipo_id) VALUES (?, ?)').run(uid, equipoId);
  ctx.vinculos.set(uid, equipoId);
}

function importarPartidoTablet(db, payload, ctx) {
  const p = payload.partido || {};
  const origenUid = cleanPistaText(p.origen_uid, 80);
  if (origenUid) {
    const ya = db.prepare('SELECT id FROM partidos_pista WHERE origen_uid = ?').get(origenUid);
    if (ya) return { partidoId: ya.id, duplicado: true };
  }

  const nombreEquipo = cleanPistaText(p.equipo || 'Mi equipo', 160) || 'Mi equipo';
  const nombreRival = cleanPistaText(p.rival || 'Rival', 160) || 'Rival';
  const fecha = p.fecha || new Date().toISOString().slice(0, 10);
  const uidEquipo = cleanPistaText(p.equipo_uid, 80);

  const entrante = { uid: uidEquipo, nombre: nombreEquipo, roster: payload.roster.map(j => ({ dorsal: Number(j.dorsal), nombre: j.nombre })) };
  const coincidencia = buscarEquipoCoincidente(ctx.equipos, ctx.vinculos, entrante);
  let equipo; let metodo;
  if (coincidencia) {
    equipo = coincidencia.equipo; metodo = coincidencia.metodo;
  } else {
    const r = db.prepare('INSERT INTO equipos_pista (nombre) VALUES (?)').run(nombreEquipo);
    equipo = { id: r.lastInsertRowid, nombre: nombreEquipo, jugadores: [] };
    ctx.equipos.push(equipo); metodo = 'nuevo';
  }
  vincularEquipo(db, ctx, uidEquipo, equipo.id);

  // Sin id de partido (archivos antiguos): se considera repetido si coincide equipo, fecha, rival y nº de acciones.
  const candidatos = db.prepare('SELECT id FROM partidos_pista WHERE equipo_id = ? AND fecha = ? AND rival_nombre = ?').all(equipo.id, fecha, nombreRival);
  for (const c of candidatos) {
    const n = db.prepare("SELECT COUNT(*) AS n FROM acciones_pista WHERE partido_id = ? AND tipo_accion <> 'fin_set'").get(c.id).n;
    if (n === payload.acciones.length) return { partidoId: c.id, duplicado: true };
  }

  const parciales = String(p.resultado_sets || '').split(',').map(x => x.trim()).filter(Boolean).map(x => x.split('-').map(Number));
  const setsLocal = parciales.filter(([l, r]) => l > r).length;
  const setsRival = parciales.filter(([l, r]) => r > l).length;
  const partidoId = db.prepare(`
    INSERT INTO partidos_pista (fecha, equipo_id, equipo_nombre, rival_nombre, video_tipo, video_url, resultado, resultado_parciales, notas, finalizado, llevar_rotaciones, origen_uid, tiempo_jugado)
    VALUES (@fecha, @equipo_id, @equipo_nombre, @rival_nombre, 'ninguno', '', @resultado, @parciales, @notas, @finalizado, 0, @origen_uid, @tiempo_jugado)
  `).run({
    fecha, equipo_id: equipo.id, equipo_nombre: equipo.nombre, rival_nombre: nombreRival,
    resultado: parciales.length ? `${setsLocal}-${setsRival}` : '',
    parciales: cleanPistaText(p.resultado_sets, 200),
    notas: 'Importado desde VolleyStats Tablet.',
    finalizado: p.terminado ? 1 : 0,
    origen_uid: origenUid || null,
    tiempo_jugado: payload.tiempoJugado ? JSON.stringify(payload.tiempoJugado) : null
  }).lastInsertRowid;

  // Jugadores del equipo por dorsal, para no duplicar si ya existían.
  const porDorsal = new Map(db.prepare('SELECT * FROM jugadores_pista WHERE equipo_id = ?').all(equipo.id).map(j => [Number(j.dorsal), j]));
  const insertJugador = db.prepare('INSERT INTO jugadores_pista (equipo_id, dorsal, nombre, posicion, es_libero) VALUES (?, ?, ?, ?, ?)');
  const insertRoster = db.prepare('INSERT INTO roster_partido (partido_id, dorsal, nombre, posicion, es_libero, jugador_pista_id) VALUES (?, ?, ?, ?, ?, ?)');
  payload.roster.forEach(j => {
    const dorsal = Number(j.dorsal);
    if (!Number.isInteger(dorsal) || dorsal < 0 || dorsal > 99) return;
    const nombre = cleanPistaText(j.nombre, 160);
    let existente = porDorsal.get(dorsal);
    if (!existente) {
      const r = insertJugador.run(equipo.id, dorsal, nombre, cleanPistaText(j.posicion, 60), j.es_libero ? 1 : 0);
      existente = { id: r.lastInsertRowid, dorsal, nombre };
      porDorsal.set(dorsal, existente);
      equipo.jugadores.push({ dorsal, nombre });
    } else if (!existente.nombre && nombre) {
      db.prepare('UPDATE jugadores_pista SET nombre = ? WHERE id = ?').run(nombre, existente.id);
      existente.nombre = nombre;
    }
    insertRoster.run(partidoId, dorsal, nombre || existente.nombre || '', cleanPistaText(j.posicion, 60), j.es_libero ? 1 : 0, existente.id);
  });

  // La tablet no manda el cierre de cada set: se añade (fin_set) al terminar las acciones del set
  // para que el informe y el resultado salgan igual que en un partido apuntado aquí.
  const cerrarSet = (setNum) => {
    const marcador = parciales[setNum - 1];
    if (!marcador) return;
    const [l, r] = marcador;
    insertarAccionPista(db, {
      partido_id: partidoId, dorsal: 0, rotacion: 1, tipo_accion: 'fin_set', subtipo: 'Ganador Set',
      resultado: l > r ? 'local' : 'rival', set_numero: setNum, marcador_local: String(l), marcador_rival: String(r)
    });
  };
  let setActual = null;
  payload.acciones.forEach(a => {
    if (setActual !== null && a.set_numero !== setActual) cerrarSet(setActual);
    setActual = a.set_numero;
    insertarAccionPista(db, { ...a, partido_id: partidoId });
  });
  if (setActual !== null) cerrarSet(setActual);

  return { partidoId, duplicado: false, equipoId: equipo.id, equipoNombre: equipo.nombre, metodo };
}

const esPartidoTablet = (x) => x?.format === 'volleystats-tablet' && Array.isArray(x.acciones) && Array.isArray(x.roster);

function leerJson(ruta) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf-8')); } catch { return null; }
}

ipcMain.handle('pista:partidos:importFromTablet', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Importar partido de VolleyStats Tablet',
    filters: [{ name: 'Partido de tablet (JSON)', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const payload = leerJson(result.filePaths[0]);
  if (!payload) throw new Error('El archivo no es un JSON válido.');
  if (!esPartidoTablet(payload)) throw new Error('Ese archivo no es un partido exportado desde VolleyStats Tablet.');

  const db = getDBPista();
  return db.transaction(() => importarPartidoTablet(db, payload, contextoImportacion(db)).partidoId)();
});

// Importación masiva: acepta uno o varios archivos (p. ej. de dos tablets) con todos los partidos.
ipcMain.handle('pista:partidos:importBulk', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Importar todos los partidos de VolleyStats Tablet',
    filters: [{ name: 'Exportación de tablet (JSON)', extensions: ['json'] }],
    properties: ['openFile', 'multiSelections']
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const partidos = [];
  let invalidos = 0;
  result.filePaths.map(leerJson).forEach(x => {
    if (x?.format === 'volleystats-tablet-bulk' && Array.isArray(x.partidos)) x.partidos.forEach(pt => (esPartidoTablet(pt) ? partidos.push(pt) : invalidos++));
    else if (esPartidoTablet(x)) partidos.push(x);
    else invalidos++;
  });
  if (!partidos.length) throw new Error('No hay partidos de VolleyStats Tablet en los archivos elegidos.');

  const db = getDBPista();
  return db.transaction(() => {
    const ctx = contextoImportacion(db);
    const equipos = new Map();
    let importados = 0;
    let duplicados = 0;
    partidos.forEach(pt => {
      const r = importarPartidoTablet(db, pt, ctx);
      if (r.duplicado) { duplicados++; return; }
      importados++;
      const e = equipos.get(r.equipoId) || { id: r.equipoId, nombre: r.equipoNombre, partidos: 0, metodos: new Set() };
      e.partidos++; e.metodos.add(r.metodo);
      equipos.set(r.equipoId, e);
    });
    return { importados, duplicados, invalidos, equipos: [...equipos.values()].map(e => ({ ...e, metodos: [...e.metodos] })) };
  })();
});

// Todo lo necesario para analizar un equipo: sus partidos (apuntados aquí o importados) con roster y acciones.
ipcMain.handle('pista:equipos:getDatosAnalisis', (_event, equipoId) => {
  const db = getDBPista();
  const equipo = db.prepare('SELECT * FROM equipos_pista WHERE id = ?').get(equipoId);
  if (!equipo) throw new Error('Equipo no encontrado.');
  const jugadores = db.prepare('SELECT * FROM jugadores_pista WHERE equipo_id = ? ORDER BY dorsal').all(equipoId);
  const partidos = db.prepare('SELECT * FROM partidos_pista WHERE equipo_id = ? ORDER BY fecha, id').all(equipoId).map(p => ({
    ...p,
    roster: db.prepare('SELECT * FROM roster_partido WHERE partido_id = ? ORDER BY dorsal').all(p.id),
    acciones: db.prepare('SELECT * FROM acciones_pista WHERE partido_id = ? ORDER BY id').all(p.id)
  }));
  return { equipo, jugadores, partidos };
});

// ---- VIDEO PISTA ----
const ytCache = new Map();

// Proceso de ffmpeg en curso (para poder cancelarlo) y ajustes de calidad/resolución compartidos
// por el generador de vídeos de pista y el de playa.
let ffmpegPistaActivo = null;
const CRF_POR_CALIDAD = { alta: 18, media: 23, baja: 28 };
const ESCALA_POR_RESOLUCION = { '720': 'scale=-2:720', '1080': 'scale=-2:1080' };

ipcMain.handle('pista:video:cancel', () => {
  if (ffmpegPistaActivo) {
    ffmpegPistaActivo.kill('SIGKILL');
    ffmpegPistaActivo = null;
    return true;
  }
  return false;
});


// Carpeta persistente (junto a la base de datos) donde se guardan los vídeos de YouTube ya
// descargados, para no perderlos si el sistema limpia la carpeta temporal. Se comparte con
// ipc-handlers.js (playa): mismo cálculo de nombre de archivo, así que ambas pantallas
// reutilizan la misma descarga de un mismo vídeo.
const getYoutubeCacheDir = () => path.join(app.getPath('userData'), 'youtube_cache');

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

    // En una carpeta persistente (no en la temporal del sistema): si se guardara en el
    // temporal, Windows la puede vaciar solo, y el vídeo ya descargado se perdería y volvería
    // a bajarse entero la próxima vez.
    const tmpDir = getYoutubeCacheDir();
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

// Acciones del mismo punto comparten clave; en datos antiguos se usa el marcador.
const claveRally = (a) => (a.punto_num ? `${a.set_numero}_p${a.punto_num}` : `${a.set_numero}_${a.marcador_local}_${a.marcador_rival}`);

ipcMain.handle('pista:video:generateHighlights', async (_event, partidoId, filters) => {
  const db = getDBPista();
  
  const partido = db.prepare('SELECT video_url, video_tipo FROM partidos_pista WHERE id = ?').get(partidoId);
  if (!partido || !partido.video_url || (partido.video_tipo !== 'local' && partido.video_tipo !== 'youtube')) {
    throw new Error('El partido no tiene un vídeo válido configurado.');
  }

  // Si el vídeo es de YouTube y no está cacheado, esto puede tardar bastante en descargarlo:
  // avisamos a la barra de progreso para que no parezca que el export está colgado en 0%.
  const videoPath = await resolverVideoPath(partido, (prog) => {
    _event.sender.send('pista:video:downloading', prog);
  });

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar Vídeo',
    defaultPath: filters.nombre_archivo ? `${String(filters.nombre_archivo).replace(/[^\w.-]+/g, '_')}.mp4` : `video_pista_${partidoId}.mp4`,
    filters: [
      { name: 'Vídeo MP4', extensions: ['mp4'] }
    ]
  });

  if (canceled || !filePath) return null;

  let query = 'SELECT * FROM acciones_pista WHERE partido_id = ? AND video_timestamp > 0';
  const params = [partidoId];

  if (filters.set_numero) {
    query += ' AND set_numero = ?';
    params.push(parseInt(filters.set_numero, 10));
  }

  const ids = Array.isArray(filters.ids) ? filters.ids.map(n => parseInt(n, 10)).filter(Number.isInteger) : [];
  if (ids.length) {
    query += ` AND id IN (${ids.map(() => '?').join(',')})`;
    params.push(...ids);
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
    // Aciertos: aces, ataques ganadores y bloqueos punto.
    if (filters.aciertos) {
      query += " AND resultado = '#' AND tipo_accion IN ('saque', 'ataque', 'bloqueo')";
    }
  }
  
  query += ' ORDER BY video_timestamp ASC';

  let acciones = db.prepare(query).all(...params);

  // Para "punto completo cuando ataque un jugador" primero encontramos los
  // ataques del jugador y después recuperamos todas las acciones de los
  // rallies que contienen uno de esos ataques.
  if (filters.modo === 'puntos_ataques') {
    const selectedIds = new Set(acciones.map(a => a.id));
    let allQuery = 'SELECT * FROM acciones_pista WHERE partido_id = ? AND video_timestamp > 0';
    const allParams = [partidoId];
    if (filters.set_numero) {
      allQuery += ' AND set_numero = ?';
      allParams.push(parseInt(filters.set_numero, 10));
    }
    const allAcciones = db.prepare(allQuery + ' ORDER BY id ASC').all(...allParams);
    const rallies = resumirRallies(allAcciones).map(r => r.acciones);
    acciones = rallies.filter(group => group.some(a => selectedIds.has(a.id))).flat();
  }
  
  if (acciones.length === 0) {
    throw new Error('No se encontraron acciones con esos filtros que tengan un tiempo de vídeo registrado.');
  }

  const preMargin = filters.pre_margin !== undefined ? parseFloat(filters.pre_margin) : 4;
  const postMargin = filters.post_margin !== undefined ? parseFloat(filters.post_margin) : 4;

  let intervals = [];

  if (filters.modo === 'puntos' || filters.modo === 'favoritos' || filters.modo === 'puntos_ataques') {
    const grupos = {};
    if (filters.modo === 'puntos' || filters.modo === 'puntos_ataques') {
      const rallies = resumirRallies(acciones).map(r => r.acciones);
      // Con `ids` (botón de guardar de un punto) todo es un único clip.
      if (ids.length) grupos[0] = { acciones: [...acciones] };
      else rallies.forEach((group, index) => { grupos[index] = { acciones: group }; });
    } else {
      acciones.forEach(a => {
        const key = claveRally(a);
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
      // La última acción se apunta en el momento del golpe: el balón aún tarda en caer y el
      // punto no termina ahí, así que en los rallies se deja un segundo extra de cola.
      const colaExtra = 1.0;
      
      return {
        start: Math.max(0, (primera.video_timestamp - actualPreMargin)),
        end: (ultima.video_timestamp + postMargin + colaExtra),
        score: `${primera.marcador_local || 0} - ${primera.marcador_rival || 0}`,
        acciones: g.acciones
      };
    });
  } else {
    const grupos = {};
    acciones.forEach(a => {
      const key = claveRally(a);
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

  // Marcador de sets antes de cada set, para mostrarlo junto al marcador del punto.
  const finSets = db.prepare("SELECT set_numero, resultado FROM acciones_pista WHERE partido_id = ? AND tipo_accion = 'fin_set'").all(partidoId);
  const setsAntesDe = (setNumero) => {
    const previos = finSets.filter(f => Number(f.set_numero) < Number(setNumero));
    return `${previos.filter(f => f.resultado === 'local').length}-${previos.filter(f => f.resultado === 'rival').length}`;
  };

  const hasAudio = await tieneAudio(videoPath);

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
  const crf = CRF_POR_CALIDAD[filters.calidad] ?? CRF_POR_CALIDAD.media;
  const escala = ESCALA_POR_RESOLUCION[filters.resolucion]; // undefined = resolución original
  // La portada exige que todos los clips compartan resolución (lo pide el filtro concat),
  // así que solo se ofrece cuando se ha elegido una resolución explícita.
  const conPortada = !!filters.portada && !!escala;

  let ffmpegArgs = ['-y'];
  let siguienteIndice = 0;

  if (conPortada) {
      const duracionPortada = 2.5;
      const anchoPortada = filters.resolucion === '1080' ? 1920 : 1280;
      const altoPortada = filters.resolucion === '1080' ? 1080 : 720;
      ffmpegArgs.push('-f', 'lavfi', '-t', String(duracionPortada), '-i', `color=c=black:s=${anchoPortada}x${altoPortada}:r=25`);
      if (hasAudio) ffmpegArgs.push('-f', 'lavfi', '-t', String(duracionPortada), '-i', 'anullsrc=r=44100:cl=stereo');
      const titulo = String(filters.titulo || 'Resumen del partido').replace(/[':\\]/g, ' ');
      const iPortada = siguienteIndice;
      filterGraph += `[${iPortada}:v]drawtext=text='${titulo}':fontcolor=white:fontsize=54:x=(w-tw)/2:y=(h-th)/2[v${iPortada}];\n`;
      if (hasAudio) {
          filterGraph += `[${iPortada + 1}:a]anull[a${iPortada}];\n`;
          concatInputs += `[v${iPortada}][a${iPortada}]`;
      } else {
          concatInputs += `[v${iPortada}]`;
      }
      siguienteIndice += hasAudio ? 2 : 1;
  }

  intervals.forEach((interval, idx) => {
      const i = siguienteIndice + idx;
      const duration = interval.end - interval.start;
      ffmpegArgs.push('-ss', interval.start.toFixed(3), '-t', duration.toFixed(3), '-i', videoPath);

      const setDelIntervalo = interval.acciones?.[0]?.set_numero;
      const text = setDelIntervalo ? ` ${String(interval.score).replace(/ /g, "")} (${setsAntesDe(setDelIntervalo)}) ` : ` ${interval.score} `;
      const conMarcador = filters.con_marcador !== false;
      let vFilters = ['setpts=PTS-STARTPTS'];
      if (escala) vFilters.push(escala);

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

  const totalClips = intervals.length + (conPortada ? 1 : 0);
  filterGraph += `${concatInputs}concat=n=${totalClips}:v=1:a=${hasAudio ? 1 : 0}[outv]${hasAudio ? '[outa]' : ''}`;

  fs.writeFileSync(filterFilePath, filterGraph);

  try {
      ffmpegArgs.push('-filter_complex_script', filterFilePath, '-map', '[outv]');
      if (hasAudio) {
          ffmpegArgs.push('-map', '[outa]');
      }
      ffmpegArgs.push('-preset', 'superfast', '-crf', String(crf), filePath);

      const totalDuration = intervals.reduce((acc, curr) => acc + (curr.end - curr.start), 0) + (conPortada ? 2.5 : 0);

      await new Promise((resolve, reject) => {
          const ffmpeg = spawn(getFfmpegPath(), ffmpegArgs);
          ffmpegPistaActivo = ffmpeg;

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

          ffmpeg.on('close', (code, signal) => {
              ffmpegPistaActivo = null;
              if (code === 0) resolve();
              else if (signal === 'SIGKILL' || signal === 'SIGTERM') reject(new Error('CANCELADO'));
              else reject(new Error('FFmpeg exited con código ' + code));
          });
          ffmpeg.on('error', reject);
      });

      _event.sender.send('pista:video:progress', 100);
      shell.openPath(filePath);
      return filePath;
  } catch (err) {
      ffmpegPistaActivo = null;
      if (err.message === 'CANCELADO') {
          try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
          throw new Error('CANCELADO');
      }
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
