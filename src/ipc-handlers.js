import { ipcMain, dialog, BrowserWindow, shell, app } from 'electron';
import { getDB } from './database.js';
import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);


// ---- JUGADORES ----

ipcMain.handle('jugadores:getAll', () => {
  const db = getDB();
  return db.prepare('SELECT * FROM jugadores ORDER BY nombre, apellidos').all();
});

ipcMain.handle('jugadores:create', (_event, data) => {
  const db = getDB();
  const completo = { nombre: '', apellidos: '', nacionalidad: '', posicion: '', notas: '', ...data };
  const stmt = db.prepare(`
    INSERT INTO jugadores (nombre, apellidos, nacionalidad, posicion, notas)
    VALUES (@nombre, @apellidos, @nacionalidad, @posicion, @notas)
  `);
  const result = stmt.run(completo);
  return { id: result.lastInsertRowid, ...completo };
});

ipcMain.handle('jugadores:update', (_event, id, data) => {
  const db = getDB();
  const campos = Object.keys(data);
  if (campos.length === 0) return true;
  const sets = campos.map(c => `${c} = @${c}`).join(', ');
  const stmt = db.prepare(`UPDATE jugadores SET ${sets} WHERE id = @id`);
  return stmt.run({ ...data, id });
});

ipcMain.handle('jugadores:delete', (_event, id) => {
  const db = getDB();
  return db.prepare('DELETE FROM jugadores WHERE id = ?').run(id);
});

// ---- CARPETAS ----

ipcMain.handle('carpetas:getAll', () => {
  const db = getDB();
  return db.prepare('SELECT * FROM carpetas ORDER BY nombre').all();
});

ipcMain.handle('carpetas:create', (_event, nombre) => {
  const db = getDB();
  const stmt = db.prepare('INSERT INTO carpetas (nombre) VALUES (?)');
  const result = stmt.run(nombre);
  return { id: result.lastInsertRowid, nombre };
});

ipcMain.handle('carpetas:delete', (_event, id) => {
  const db = getDB();
  // Los partidos vuelven a la raíz
  db.prepare('UPDATE partidos SET carpeta_id = NULL WHERE carpeta_id = ?').run(id);
  return db.prepare('DELETE FROM carpetas WHERE id = ?').run(id);
});

// ---- PARTIDOS ----

ipcMain.handle('partidos:getAll', () => {
  const db = getDB();
  return db.prepare(`
    SELECT *
    FROM partidos
    ORDER BY fecha DESC
  `).all();
});

ipcMain.handle('partidos:getById', (_event, id) => {
  const db = getDB();
  return db.prepare(`
    SELECT *
    FROM partidos
    WHERE id = ?
  `).get(id);
});

ipcMain.handle('partidos:create', (_event, data) => {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO partidos (fecha, torneo, fase, jugador1_nombre, jugador2_nombre, video_tipo, video_url, resultado, notas)
    VALUES (@fecha, @torneo, @fase, @jugador1_nombre, @jugador2_nombre, @video_tipo, @video_url, @resultado, @notas)
  `);
  const completeData = {
    fecha: '', torneo: '', fase: '', jugador1_nombre: '', jugador2_nombre: '',
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
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM acciones WHERE partido_id = ?').run(id);
    db.prepare('DELETE FROM partidos WHERE id = ?').run(id);
  });
  transaction();
  return true;
});

ipcMain.handle('partidos:moveToCarpeta', (_event, partidoId, carpetaId) => {
  const db = getDB();
  return db.prepare('UPDATE partidos SET carpeta_id = ? WHERE id = ?').run(carpetaId, partidoId);
});

// ---- ACCIONES ----

ipcMain.handle('acciones:getByPartido', (_event, partidoId) => {
  const db = getDB();
  return db.prepare(`
    SELECT *
    FROM acciones
    WHERE partido_id = ?
    ORDER BY id
  `).all(partidoId);
});

ipcMain.handle('acciones:create', (_event, data) => {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO acciones (partido_id, jugador_nombre, complejo, tipo_accion, subtipo, resultado, set_numero, marcador_local, marcador_rival, video_timestamp, zona_campo, es_favorito)
    VALUES (@partido_id, @jugador_nombre, @complejo, @tipo_accion, @subtipo, @resultado, @set_numero, @marcador_local, @marcador_rival, @video_timestamp, @zona_campo, @es_favorito)
  `);
  const result = stmt.run({...data, es_favorito: data.es_favorito ? 1 : 0});
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

  const totalAcciones = db.prepare(`
    SELECT jugador_nombre, COUNT(*) AS total
    FROM acciones
    WHERE partido_id = ?
    GROUP BY jugador_nombre
  `).all(partidoId);

  const sideOut = db.prepare(`
    SELECT jugador_nombre,
      COUNT(*) AS total_k1,
      SUM(CASE WHEN resultado = 'punto' THEN 1 ELSE 0 END) AS puntos_k1
    FROM acciones
    WHERE partido_id = ? AND complejo = 'K1'
    GROUP BY jugador_nombre
  `).all(partidoId);

  const sideOutPorJugador = sideOut.map(row => ({
    jugador_nombre: row.jugador_nombre,
    total_k1: row.total_k1,
    puntos_k1: row.puntos_k1,
    porcentaje: row.total_k1 > 0 ? Math.round((row.puntos_k1 / row.total_k1) * 100) : 0
  }));

  const ataques = db.prepare(`
    SELECT jugador_nombre, subtipo, resultado, COUNT(*) AS total
    FROM acciones
    WHERE partido_id = ? AND tipo_accion = 'ataque'
    GROUP BY jugador_nombre, subtipo, resultado
  `).all(partidoId);

  const saques = db.prepare(`
    SELECT jugador_nombre, subtipo, resultado, COUNT(*) AS total
    FROM acciones
    WHERE partido_id = ? AND tipo_accion = 'saque'
    GROUP BY jugador_nombre, subtipo, resultado
  `).all(partidoId);

  const recepcion = db.prepare(`
    SELECT jugador_nombre, resultado, COUNT(*) AS total
    FROM acciones
    WHERE partido_id = ? AND tipo_accion = 'recepcion'
    GROUP BY jugador_nombre, resultado
  `).all(partidoId);

  const eficaciaAtaque = db.prepare(`
    SELECT jugador_nombre,
      COUNT(*) AS total,
      SUM(CASE WHEN resultado = 'punto' THEN 1 ELSE 0 END) AS puntos,
      SUM(CASE WHEN resultado = 'error' THEN 1 ELSE 0 END) AS errores
    FROM acciones
    WHERE partido_id = ? AND tipo_accion = 'ataque'
    GROUP BY jugador_nombre
  `).all(partidoId);

  const eficaciaPorJugador = eficaciaAtaque.map(row => ({
    jugador_nombre: row.jugador_nombre,
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

    const ytdlp = fs.existsSync('/home/dario/.local/bin/yt-dlp') ? '/home/dario/.local/bin/yt-dlp' : 'yt-dlp';

    // las versiones recientes de yt-dlp requieren un runtime de JS y el
    // solucionador remoto de retos para extraer vídeos de YouTube. Usamos node
    // (instalado con la app) y el componente remoto 'ejs'. Se intenta primero la
    // extracción completa y, si falla, se prueba el cliente 'android' como respaldo.
    const nodePath = fs.existsSync('/usr/bin/node') ? '/usr/bin/node' : 'node';
    const runtimeArgs = ['--js-runtimes', `node:${nodePath}`, '--remote-components', 'ejs:github'];
    const intentos = [
      [...runtimeArgs, '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best',
        '--merge-output-format', 'mp4', '--no-playlist'],
      [...runtimeArgs, '-f', 'best[ext=mp4]/best', '--no-playlist',
        '--extractor-args', 'youtube:player_client=android']
    ];

    let ultimoError = '';
    for (const args of intentos) {
      try {
        await execFileAsync(ytdlp, [...args, '-o', outputPath, partido.video_url], { timeout: 600000 });
        if (fs.existsSync(outputPath)) break;
      } catch(e) {
        ultimoError = (e && (e.stderr || e.message)) ? String(e.stderr || e.message) : String(e);
        console.error('yt-dlp falló:', ultimoError);
      }
    }

    if (!fs.existsSync(outputPath)) {
      const detalle = ultimoError ? ` Detalle: ${ultimoError.split('\n').filter(Boolean).slice(-2).join(' ')}` : '';
      throw new Error(`No se pudo descargar el vídeo de YouTube.${detalle}`);
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

  let query = 'SELECT video_timestamp, marcador_local, marcador_rival, set_numero, complejo, tipo_accion, subtipo, resultado, jugador_nombre FROM acciones WHERE partido_id = ? AND video_timestamp > 0';
  const params = [partidoId];

  // filtro por set (aplica a todos los modos)
  if (filters.set_numero) {
    query += ' AND set_numero = ?';
    params.push(parseInt(filters.set_numero, 10));
  }

  if (filters.modo === 'favoritos') {
    query += ' AND es_favorito = 1';
  } else if (filters.modo !== 'puntos') {
    if (filters.jugador_nombre) {
      query += ' AND jugador_nombre = ?';
      params.push(filters.jugador_nombre);
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
  }
  
  query += ' ORDER BY video_timestamp ASC';

  const acciones = db.prepare(query).all(...params);
  
  if (acciones.length === 0) {
    throw new Error('No se encontraron acciones con esos filtros que tengan un tiempo de vídeo registrado.');
  }

  const preMargin = filters.pre_margin !== undefined ? parseFloat(filters.pre_margin) : 3;
  const postMargin = filters.post_margin !== undefined ? parseFloat(filters.post_margin) : 1;

  let intervals = [];

  if (filters.modo === 'puntos' || filters.modo === 'favoritos') {
    // Agrupar por set y marcador para formar puntos/rallies completos
    const grupos = {};
    acciones.forEach(a => {
      const key = `${a.set_numero}_${a.marcador_local}_${a.marcador_rival}`;
      if (!grupos[key]) {
        grupos[key] = {
          acciones: []
        };
      }
      grupos[key].acciones.push(a);
    });

    intervals = Object.values(grupos).map(g => {
      // Ordenamos las acciones del punto cronológicamente
      g.acciones.sort((x, y) => x.video_timestamp - y.video_timestamp);
      
      const primera = g.acciones[0];
      const ultima = g.acciones[g.acciones.length - 1];
      
      // Si la primera acción del punto es recepción, añadimos 1 segundo extra
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
    // Modo filtrar jugadas (comportamiento original agrupando por complejo para evitar microcortes)
    const grupos = {};
    acciones.forEach(a => {
      const key = `${a.set_numero}_${a.marcador_local}_${a.marcador_rival}_${a.complejo}`;
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
  
  if (intervals.length > 0) {
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

  // comprobamos si tiene audio para que el filtro no pete
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

  const filterFilePath = path.join(os.tmpdir(), `bvscouter_filter_${Date.now()}.txt`);
  let filterGraph = '';
  let concatInputs = '';

  // etiquetas cortas para la tarjeta de acciones
  const RESULT_ICONS = { punto: '● PUNTO', error: '✕ ERROR', bloqueado: '✕ BLOQUEADO', continuidad: '→', neutra: '·' };
  const buildActionLines = (accs) => {
      const orden = [...(accs || [])].sort((a, b) => a.video_timestamp - b.video_timestamp);
      return orden
        .filter(a => a.tipo_accion !== 'fin_set')
        .slice(0, 8)
        .map(a => {
            const tipo = (a.tipo_accion || '').charAt(0).toUpperCase() + (a.tipo_accion || '').slice(1);
            const sub = a.subtipo ? ` ${a.subtipo}` : '';
            const res = RESULT_ICONS[a.resultado] || (a.resultado || '');
            const jugador = a.jugador_nombre ? `${a.jugador_nombre} · ` : '';
            return ` ${jugador}${tipo}${sub}  ${res} `;
        });
  };

  const mostrarAcciones = !!filters.mostrar_acciones;
  const textFiles = [];
  const sessionId = Date.now();

  intervals.forEach((interval, i) => {
      // marcador bonito arriba a la derecha
      const text = ` ${interval.score} `;
      let extraDraw = '';

      if (mostrarAcciones) {
          const lines = buildActionLines(interval.acciones);
          if (lines.length > 0) {
              const txtPath = path.join(os.tmpdir(), `bvscouter_card_${sessionId}_${i}.txt`);
              fs.writeFileSync(txtPath, lines.join('\n'));
              textFiles.push(txtPath);
              extraDraw = `,drawtext=textfile=${txtPath}:expansion=none:fontcolor=white:fontsize=26:line_spacing=10:box=1:boxcolor=black@0.65:boxborderw=14:x=30:y=h-th-40`;
          }
      }

      filterGraph += `[0:v]trim=start=${interval.start.toFixed(2)}:end=${interval.end.toFixed(2)},setpts=PTS-STARTPTS,drawtext=text='${text}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.6:boxborderw=15:x=w-tw-30:y=30${extraDraw}[v${i}];\n`;
      
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
      // re-encode the segments, fixes glitching perfectly
      const audioMap = hasAudio ? ['-map', '[outa]'] : [];
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', videoPath,
        '-filter_complex_script', filterFilePath,
        '-map', '[outv]',
        ...audioMap,
        filePath
      ]);
      
      shell.openPath(filePath);
      return filePath;
  } catch (err) {
      console.error('Error con FFmpeg:', err);
      throw new Error('Fallo al generar el vídeo. FFmpeg no pudo procesarlo.');
  } finally {
      if (fs.existsSync(filterFilePath)) {
          fs.unlinkSync(filterFilePath);
      }
      textFiles.forEach(f => {
          try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
      });
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



// ---- COPIAS DE SEGURIDAD ----

ipcMain.handle('db:backup', async () => {
  const db = getDB();
  const fecha = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar copia de seguridad',
    defaultPath: `bvscouter_backup_${fecha}.db`,
    filters: [{ name: 'Base de datos BVScouter', extensions: ['db'] }]
  });
  if (canceled || !filePath) return null;
  await db.backup(filePath);
  return filePath;
});

ipcMain.handle('db:restore', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Seleccionar copia de seguridad',
    filters: [{ name: 'Base de datos BVScouter', extensions: ['db'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const backupPath = result.filePaths[0];
  const db = getDB();
  const dbPath = db.name;

  // cerramos la BD actual, copiamos el backup encima y reiniciamos la app
  db.close();
  fs.copyFileSync(backupPath, dbPath);
  // limpiamos los ficheros WAL/SHM antiguos para evitar inconsistencias
  try { if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal'); } catch (e) {}
  try { if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm'); } catch (e) {}

  app.relaunch();
  app.exit(0);
  return true;
});

// ---- EXPORTAR ACCIONES A CSV ----

ipcMain.handle('acciones:exportCSV', async (_event, partidoId) => {
  const db = getDB();
  const partido = db.prepare('SELECT * FROM partidos WHERE id = ?').get(partidoId);
  if (!partido) throw new Error('Partido no encontrado.');

  const acciones = db.prepare('SELECT * FROM acciones WHERE partido_id = ? ORDER BY id').all(partidoId);
  if (acciones.length === 0) throw new Error('El partido no tiene acciones registradas.');

  const nombre = `${partido.jugador1_nombre}_${partido.jugador2_nombre}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar acciones a CSV',
    defaultPath: `acciones_${nombre}_${partido.fecha || partidoId}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (canceled || !filePath) return null;

  const cols = ['id', 'set_numero', 'marcador_local', 'marcador_rival', 'jugador_nombre', 'complejo', 'tipo_accion', 'subtipo', 'resultado', 'video_timestamp', 'es_favorito', 'created_at'];
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(';')];
  acciones.forEach(a => lines.push(cols.map(c => escape(a[c])).join(';')));

  fs.writeFileSync(filePath, '\ufeff' + lines.join('\n'), 'utf8');
  return filePath;
});
