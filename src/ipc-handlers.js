import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getDB } from './database.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const execAsync = promisify(exec);

// ---- JUGADORES ----

ipcMain.handle('jugadores:getAll', () => {
  const db = getDB();
  return db.prepare('SELECT * FROM jugadores ORDER BY apellidos').all();
});

ipcMain.handle('jugadores:getById', (_event, id) => {
  const db = getDB();
  return db.prepare('SELECT * FROM jugadores WHERE id = ?').get(id);
});

ipcMain.handle('jugadores:create', (_event, data) => {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO jugadores (nombre, apellidos, nacionalidad, posicion, notas)
    VALUES (@nombre, @apellidos, @nacionalidad, @posicion, @notas)
  `);
  const result = stmt.run(data);
  return result.lastInsertRowid;
});

ipcMain.handle('jugadores:update', (_event, id, data) => {
  const db = getDB();
  const stmt = db.prepare(`
    UPDATE jugadores
    SET nombre = @nombre, apellidos = @apellidos, nacionalidad = @nacionalidad,
        posicion = @posicion, notas = @notas
    WHERE id = @id
  `);
  return stmt.run({ ...data, id });
});

ipcMain.handle('jugadores:delete', (_event, id) => {
  const db = getDB();
  // borramos también las acciones relacionadas
  db.prepare('DELETE FROM acciones WHERE jugador_id = ?').run(id);
  return db.prepare('DELETE FROM jugadores WHERE id = ?').run(id);
});

// ---- PARTIDOS ----

ipcMain.handle('partidos:getAll', () => {
  const db = getDB();
  return db.prepare(`
    SELECT p.*,
      j1.nombre AS jugador1_nombre, j1.apellidos AS jugador1_apellidos,
      j2.nombre AS jugador2_nombre, j2.apellidos AS jugador2_apellidos
    FROM partidos p
    LEFT JOIN jugadores j1 ON p.jugador1_id = j1.id
    LEFT JOIN jugadores j2 ON p.jugador2_id = j2.id
    ORDER BY p.fecha DESC
  `).all();
});

ipcMain.handle('partidos:getById', (_event, id) => {
  const db = getDB();
  return db.prepare(`
    SELECT p.*,
      j1.nombre AS jugador1_nombre, j1.apellidos AS jugador1_apellidos,
      j2.nombre AS jugador2_nombre, j2.apellidos AS jugador2_apellidos
    FROM partidos p
    LEFT JOIN jugadores j1 ON p.jugador1_id = j1.id
    LEFT JOIN jugadores j2 ON p.jugador2_id = j2.id
    WHERE p.id = ?
  `).get(id);
});

ipcMain.handle('partidos:create', (_event, data) => {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO partidos (fecha, torneo, fase, jugador1_id, jugador2_id, video_tipo, video_url, resultado, notas)
    VALUES (@fecha, @torneo, @fase, @jugador1_id, @jugador2_id, @video_tipo, @video_url, @resultado, @notas)
  `);
  // rellenamos campos opcionales que puedan faltar
  const completeData = {
    fecha: '', torneo: '', fase: '', jugador1_id: 0, jugador2_id: 0,
    video_tipo: '', video_url: '', resultado: '', notas: '',
    ...data
  };
  const result = stmt.run(completeData);
  return result.lastInsertRowid;
});

// update parcial - solo actualizamos los campos que nos llegan
ipcMain.handle('partidos:update', (_event, id, data) => {
  const db = getDB();
  const campos = Object.keys(data);
  if (campos.length === 0) return;
  const sets = campos.map(c => `${c} = @${c}`).join(', ');
  const stmt = db.prepare(`UPDATE partidos SET ${sets} WHERE id = @id`);
  return stmt.run({ ...data, id });
});

ipcMain.handle('partidos:delete', (_event, id) => {
  const db = getDB();
  // primero las acciones del partido
  db.prepare('DELETE FROM acciones WHERE partido_id = ?').run(id);
  return db.prepare('DELETE FROM partidos WHERE id = ?').run(id);
});

// ---- ACCIONES ----

ipcMain.handle('acciones:getByPartido', (_event, partidoId) => {
  const db = getDB();
  return db.prepare(`
    SELECT a.*, j.nombre || ' ' || j.apellidos AS jugador_nombre
    FROM acciones a
    LEFT JOIN jugadores j ON a.jugador_id = j.id
    WHERE a.partido_id = ?
    ORDER BY a.id
  `).all(partidoId);
});

ipcMain.handle('acciones:create', (_event, data) => {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO acciones (partido_id, jugador_id, complejo, tipo_accion, subtipo, resultado, set_numero, marcador_local, marcador_rival, video_timestamp, zona_campo)
    VALUES (@partido_id, @jugador_id, @complejo, @tipo_accion, @subtipo, @resultado, @set_numero, @marcador_local, @marcador_rival, @video_timestamp, @zona_campo)
  `);
  const result = stmt.run(data);
  return result.lastInsertRowid;
});

ipcMain.handle('acciones:delete', (_event, id) => {
  const db = getDB();
  return db.prepare('DELETE FROM acciones WHERE id = ?').run(id);
});

ipcMain.handle('acciones:update', (_event, id, data) => {
  const db = getDB();
  const campos = Object.keys(data);
  if (campos.length === 0) return true;
  const sets = campos.map(c => `${c} = @${c}`).join(', ');
  const stmt = db.prepare(`UPDATE acciones SET ${sets} WHERE id = @id`);
  return stmt.run({ ...data, id });
});

ipcMain.handle('acciones:deleteLastByPartido', (_event, partidoId) => {
  const db = getDB();
  // pillamos la última acción del partido y la borramos
  const last = db.prepare('SELECT id FROM acciones WHERE partido_id = ? ORDER BY id DESC LIMIT 1').get(partidoId);
  if (last) {
    db.prepare('DELETE FROM acciones WHERE id = ?').run(last.id);
    return last.id;
  }
  return null;
});

// ---- UTILIDADES ----

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Seleccionar vídeo',
    filters: [
      { name: 'Vídeos', extensions: ['mp4', 'avi', 'mkv', 'mov', 'webm'] }
    ],
    properties: ['openFile']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// ---- ESTADÍSTICAS ----

ipcMain.handle('stats:getByPartido', (_event, partidoId) => {
  const db = getDB();

  // total de acciones por jugador
  const totalAcciones = db.prepare(`
    SELECT jugador_id, j.nombre || ' ' || j.apellidos AS jugador_nombre, COUNT(*) AS total
    FROM acciones a
    LEFT JOIN jugadores j ON a.jugador_id = j.id
    WHERE a.partido_id = ?
    GROUP BY jugador_id
  `).all(partidoId);

  // side-out: acciones en K1 con resultado 'punto' vs total K1
  const sideOut = db.prepare(`
    SELECT jugador_id,
      COUNT(*) AS total_k1,
      SUM(CASE WHEN resultado = 'punto' THEN 1 ELSE 0 END) AS puntos_k1
    FROM acciones
    WHERE partido_id = ? AND complejo = 'K1'
    GROUP BY jugador_id
  `).all(partidoId);

  const sideOutPorJugador = sideOut.map(row => ({
    jugador_id: row.jugador_id,
    total_k1: row.total_k1,
    puntos_k1: row.puntos_k1,
    porcentaje: row.total_k1 > 0 ? Math.round((row.puntos_k1 / row.total_k1) * 100) : 0
  }));

  // distribución de tipos de ataque por jugador
  const ataques = db.prepare(`
    SELECT jugador_id, subtipo, resultado, COUNT(*) AS total
    FROM acciones
    WHERE partido_id = ? AND tipo_accion = 'ataque'
    GROUP BY jugador_id, subtipo, resultado
  `).all(partidoId);

  // distribución de saques por jugador
  const saques = db.prepare(`
    SELECT jugador_id, subtipo, resultado, COUNT(*) AS total
    FROM acciones
    WHERE partido_id = ? AND tipo_accion = 'saque'
    GROUP BY jugador_id, subtipo, resultado
  `).all(partidoId);

  // calidad de recepción promedio por jugador
  // usamos el subtipo como calificación numérica si se puede
  const recepcion = db.prepare(`
    SELECT jugador_id, resultado, COUNT(*) AS total
    FROM acciones
    WHERE partido_id = ? AND tipo_accion = 'recepcion'
    GROUP BY jugador_id, resultado
  `).all(partidoId);

  // eficacia de ataque: (puntos - errores) / total * 100
  const eficaciaAtaque = db.prepare(`
    SELECT jugador_id,
      COUNT(*) AS total,
      SUM(CASE WHEN resultado = 'punto' THEN 1 ELSE 0 END) AS puntos,
      SUM(CASE WHEN resultado = 'error' THEN 1 ELSE 0 END) AS errores
    FROM acciones
    WHERE partido_id = ? AND tipo_accion = 'ataque'
    GROUP BY jugador_id
  `).all(partidoId);

  const eficaciaPorJugador = eficaciaAtaque.map(row => ({
    jugador_id: row.jugador_id,
    total: row.total,
    puntos: row.puntos,
    errores: row.errores,
    eficacia: row.total > 0 ? Math.round(((row.puntos - row.errores) / row.total) * 100) : 0
  }));

  return {
    totalAcciones,
    sideOut: sideOutPorJugador,
    ataques,
    saques,
    recepcion,
    eficaciaAtaque: eficaciaPorJugador
  };
});

// ---- VIDEO HIGHLIGHTS ----
ipcMain.handle('video:generateHighlights', async (_event, partidoId, filters) => {
  const db = getDB();
  
  const partido = db.prepare('SELECT video_url, video_tipo FROM partidos WHERE id = ?').get(partidoId);
  if (!partido || partido.video_tipo !== 'local' || !partido.video_url) {
    throw new Error('El partido no tiene un vídeo local configurado.');
  }
  
  const videoPath = partido.video_url;
  if (!fs.existsSync(videoPath)) {
    throw new Error('El archivo de vídeo original no existe.');
  }

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar Highlights',
    defaultPath: `highlights_partido_${partidoId}.mp4`,
    filters: [
      { name: 'Vídeo MP4', extensions: ['mp4'] }
    ]
  });

  if (canceled || !filePath) return null;

  let query = 'SELECT video_timestamp FROM acciones WHERE partido_id = ? AND video_timestamp > 0';
  const params = [partidoId];

  if (filters.jugador_id) {
    query += ' AND jugador_id = ?';
    params.push(filters.jugador_id);
  }
  if (filters.tipo_accion) {
    query += ' AND tipo_accion = ?';
    params.push(filters.tipo_accion);
  }
  if (filters.resultado) {
    query += ' AND resultado = ?';
    params.push(filters.resultado);
  }
  
  query += ' ORDER BY video_timestamp ASC';

  const acciones = db.prepare(query).all(...params);
  
  if (acciones.length === 0) {
    throw new Error('No se encontraron acciones con esos filtros que tengan un tiempo de vídeo registrado.');
  }

  const concatFilePath = path.join(os.tmpdir(), `bvscouter_concat_${Date.now()}.txt`);
  let concatData = '';
  
  acciones.forEach(accion => {
      // 4 secs before, 2 secs after
      const inpoint = Math.max(0, accion.video_timestamp - 4);
      const outpoint = accion.video_timestamp + 2;
      const safePath = videoPath.replace(/'/g, "'\\''");
      concatData += `file '${safePath}'\n`;
      concatData += `inpoint ${inpoint.toFixed(2)}\n`;
      concatData += `outpoint ${outpoint.toFixed(2)}\n`;
  });
  
  fs.writeFileSync(concatFilePath, concatData);
  
  try {
      const escapedConcat = concatFilePath.replace(/"/g, '\\"');
      const escapedOutput = filePath.replace(/"/g, '\\"');
      const cmd = `ffmpeg -y -f concat -safe 0 -i "${escapedConcat}" -c copy "${escapedOutput}"`;
      await execAsync(cmd);
      return filePath;
  } catch (err) {
      console.error('Error con FFmpeg:', err);
      throw new Error('Fallo al generar el vídeo. FFmpeg no pudo procesarlo.');
  } finally {
      if (fs.existsSync(concatFilePath)) {
          fs.unlinkSync(concatFilePath);
      }
  }
});

// ---- PDF ----

ipcMain.handle('pdf:generate', async (_event, html, contentHeight) => {
  // ventana oculta para generar el PDF
  const win = new BrowserWindow({
    show: false,
    width: 1024,
    height: 1000,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  const pdfData = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    landscape: false,
    margins: { marginType: 'none' }
  });

  win.close();

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar informe PDF',
    defaultPath: 'informe-bvscouter.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) return null;

  const { writeFileSync } = await import('node:fs');
  writeFileSync(filePath, pdfData);
  return filePath;
});

