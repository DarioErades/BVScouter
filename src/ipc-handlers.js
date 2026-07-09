import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
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

// para cachear vídeos de YouTube descargados y no bajarlos cada vez
const ytCache = new Map();

async function resolverVideoPath(partido) {
  if (partido.video_tipo === 'local') {
    if (!fs.existsSync(partido.video_url)) {
      throw new Error('El archivo de vídeo original no existe.');
    }
    return partido.video_url;
  }

  if (partido.video_tipo === 'youtube') {
    // si ya lo descargamos antes, reutilizamos
    if (ytCache.has(partido.video_url) && fs.existsSync(ytCache.get(partido.video_url))) {
      return ytCache.get(partido.video_url);
    }

    const tmpDir = path.join(os.tmpdir(), 'bvscouter_yt');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    // nombre basado en hash simple de la url para no repetir
    const safeId = partido.video_url.replace(/[^a-zA-Z0-9]/g, '_').slice(-60);
    const outputPath = path.join(tmpDir, `${safeId}.mp4`);

    if (fs.existsSync(outputPath)) {
      ytCache.set(partido.video_url, outputPath);
      return outputPath;
    }

    // descargamos con yt-dlp en formato mp4
    const escapedUrl = partido.video_url.replace(/"/g, '\\"');
    const escapedOut = outputPath.replace(/"/g, '\\"');
    const ytdlp = fs.existsSync('/home/dario/.local/bin/yt-dlp') ? '/home/dario/.local/bin/yt-dlp' : 'yt-dlp';
    const cmd = `${ytdlp} -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best" --merge-output-format mp4 -o "${escapedOut}" "${escapedUrl}"`;
    await execAsync(cmd, { timeout: 600000 });

    if (!fs.existsSync(outputPath)) {
      throw new Error('No se pudo descargar el vídeo de YouTube.');
    }

    ytCache.set(partido.video_url, outputPath);
    return outputPath;
  }

  throw new Error('Tipo de vídeo no soportado para generar highlights.');
}

ipcMain.handle('video:generateHighlights', async (_event, partidoId, filters) => {
  const db = getDB();
  
  const partido = db.prepare('SELECT video_url, video_tipo FROM partidos WHERE id = ?').get(partidoId);
  if (!partido || !partido.video_url || (partido.video_tipo !== 'local' && partido.video_tipo !== 'youtube')) {
    throw new Error('El partido no tiene un vídeo válido configurado.');
  }

  // resolvemos la ruta real del vídeo (descarga si es YouTube)
  const videoPath = await resolverVideoPath(partido);

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar Vídeo',
    defaultPath: `video_partido_${partidoId}.mp4`,
    filters: [
      { name: 'Vídeo MP4', extensions: ['mp4'] }
    ]
  });

  if (canceled || !filePath) return null;

  let query = 'SELECT video_timestamp, marcador_local, marcador_rival FROM acciones WHERE partido_id = ? AND video_timestamp > 0';
  const params = [partidoId];

  if (filters.jugador_id) {
    query += ' AND jugador_id = ?';
    params.push(filters.jugador_id);
  }
  if (filters.complejo) {
    query += ' AND complejo = ?';
    params.push(filters.complejo);
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

  const preMargin = filters.pre_margin !== undefined ? parseFloat(filters.pre_margin) : 3;
  const postMargin = filters.post_margin !== undefined ? parseFloat(filters.post_margin) : 1;

  let intervals = acciones.map(a => ({
      start: Math.max(0, a.video_timestamp - preMargin),
      end: a.video_timestamp + postMargin,
      score: `${a.marcador_local || 0} - ${a.marcador_rival || 0}`
  }));
  
  if (intervals.length > 0) {
      intervals.sort((a, b) => a.start - b.start);
      const merged = [intervals[0]];
      for (let i = 1; i < intervals.length; i++) {
          const last = merged[merged.length - 1];
          const curr = intervals[i];
          if (curr.start <= last.end) {
              last.end = Math.max(last.end, curr.end);
          } else {
              merged.push(curr);
          }
      }
      intervals = merged;
  }

  // comprobamos si tiene audio para que el filtro no pete
  let hasAudio = false;
  try {
      const { stdout } = await execAsync(`ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "${videoPath.replace(/"/g, '\\"')}"`);
      hasAudio = stdout.trim().length > 0;
  } catch(e) {}

  const filterFilePath = path.join(os.tmpdir(), `bvscouter_filter_${Date.now()}.txt`);
  let filterGraph = '';
  let concatInputs = '';

  intervals.forEach((interval, i) => {
      // marcador bonito arriba a la derecha
      const text = ` ${interval.score} `;
      filterGraph += `[0:v]trim=start=${interval.start.toFixed(2)}:end=${interval.end.toFixed(2)},setpts=PTS-STARTPTS,drawtext=text='${text}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.6:boxborderw=15:x=w-tw-30:y=30[v${i}];\n`;
      
      if (hasAudio) {
          filterGraph += `[0:a]atrim=start=${interval.start.toFixed(2)}:end=${interval.end.toFixed(2)},asetpts=PTS-STARTPTS[a${i}];\n`;
          concatInputs += `[v${i}][a${i}]`;
      } else {
          concatInputs += `[v${i}]`;
      }
  });
  
  filterGraph += `${concatInputs}concat=n=${intervals.length}:v=1:a=${hasAudio ? 1 : 0}[outv]${hasAudio ? '[outa]' : ''}`;
  
  fs.writeFileSync(filterFilePath, filterGraph);
  
  try {
      const escapedFilter = filterFilePath.replace(/"/g, '\\"');
      const escapedVideo = videoPath.replace(/"/g, '\\"');
      const escapedOutput = filePath.replace(/"/g, '\\"');
      
      // re-encode the segments, fixes glitching perfectly
      const audioMap = hasAudio ? ' -map "[outa]" ' : ' ';
      const cmd = `ffmpeg -y -i "${escapedVideo}" -filter_complex_script "${escapedFilter}" -map "[outv]"${audioMap}"${escapedOutput}"`;
      
      await execAsync(cmd);
      shell.openPath(filePath);
      return filePath;
  } catch (err) {
      console.error('Error con FFmpeg:', err);
      throw new Error('Fallo al generar el vídeo. FFmpeg no pudo procesarlo.');
  } finally {
      if (fs.existsSync(filterFilePath)) {
          fs.unlinkSync(filterFilePath);
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

