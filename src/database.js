import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';

let db = null;

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'bvscouter.db');
  db = new Database(dbPath);

  // activamos WAL pa mejor rendimiento
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS partidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      torneo TEXT DEFAULT '',
      fase TEXT DEFAULT '',
      jugador1_nombre TEXT NOT NULL,
      jugador2_nombre TEXT NOT NULL,
      video_tipo TEXT DEFAULT 'local',
      video_url TEXT DEFAULT '',
      resultado TEXT DEFAULT '',
      notas TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS acciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partido_id INTEGER NOT NULL,
      jugador_nombre TEXT NOT NULL,
      complejo TEXT NOT NULL DEFAULT 'K1',
      tipo_accion TEXT NOT NULL,
      subtipo TEXT DEFAULT '',
      resultado TEXT DEFAULT 'continuidad',
      set_numero INTEGER DEFAULT 1,
      marcador_local TEXT DEFAULT '0',
      marcador_rival TEXT DEFAULT '0',
      video_timestamp REAL DEFAULT 0,
      zona_campo TEXT DEFAULT '',
      es_favorito INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS carpetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec(`ALTER TABLE partidos ADD COLUMN carpeta_id INTEGER REFERENCES carpetas(id) ON DELETE SET NULL`);
  } catch (err) {}

  try { db.exec(`ALTER TABLE partidos ADD COLUMN jugador1_nombre TEXT DEFAULT ''`); } catch (e) {}
  try { db.exec(`ALTER TABLE partidos ADD COLUMN jugador2_nombre TEXT DEFAULT ''`); } catch (e) {}
  try { db.exec(`ALTER TABLE acciones ADD COLUMN jugador_nombre TEXT DEFAULT ''`); } catch (e) {}
  try {
    // migracion de los nombres si la tabla existia (if it has the old columns)
    const hasJugadorId = db.prepare("PRAGMA table_info(partidos)").all().some(c => c.name === 'jugador1_id');
    if (hasJugadorId) {
        db.exec(`
          UPDATE partidos SET 
            jugador1_nombre = (SELECT nombre FROM jugadores WHERE id = partidos.jugador1_id),
            jugador2_nombre = (SELECT nombre FROM jugadores WHERE id = partidos.jugador2_id)
          WHERE (jugador1_nombre = '' OR jugador1_nombre IS NULL) AND jugador1_id IS NOT NULL;
        `);
        db.exec(`
          UPDATE acciones SET 
            jugador_nombre = (SELECT nombre FROM jugadores WHERE id = acciones.jugador_id)
          WHERE (jugador_nombre = '' OR jugador_nombre IS NULL) AND jugador_id IS NOT NULL;
        `);
    }
  } catch (err) { console.error(err); }

  try {
      db.exec(`ALTER TABLE acciones ADD COLUMN es_favorito INTEGER DEFAULT 0`);
  } catch(err) {}

  // Migracion: eliminar columnas legacy jugador*_id (NOT NULL) que rompen los INSERT nuevos
  migrarEsquemaSinIds(db);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_acciones_partido ON acciones(partido_id);
    CREATE INDEX IF NOT EXISTS idx_acciones_jugador ON acciones(jugador_nombre);
    CREATE INDEX IF NOT EXISTS idx_partidos_carpeta ON partidos(carpeta_id);
  `);

  return db;
}

// Reconstruye partidos/acciones para quitar los antiguos jugador_id NOT NULL
function migrarEsquemaSinIds(db) {
  const partidosCols = db.prepare("PRAGMA table_info(partidos)").all().map(c => c.name);
  const accionesCols = db.prepare("PRAGMA table_info(acciones)").all().map(c => c.name);

  const needsPartidos = partidosCols.includes('jugador1_id');
  const needsAcciones = accionesCols.includes('jugador_id');

  if (!needsPartidos && !needsAcciones) return;

  db.pragma('foreign_keys = OFF');
  const migrar = db.transaction(() => {
    if (needsPartidos) {
      db.exec(`
        CREATE TABLE partidos_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fecha TEXT NOT NULL,
          torneo TEXT DEFAULT '',
          fase TEXT DEFAULT '',
          jugador1_nombre TEXT NOT NULL DEFAULT '',
          jugador2_nombre TEXT NOT NULL DEFAULT '',
          video_tipo TEXT DEFAULT 'local',
          video_url TEXT DEFAULT '',
          resultado TEXT DEFAULT '',
          notas TEXT DEFAULT '',
          carpeta_id INTEGER REFERENCES carpetas(id) ON DELETE SET NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
      db.exec(`
        INSERT INTO partidos_new (id, fecha, torneo, fase, jugador1_nombre, jugador2_nombre, video_tipo, video_url, resultado, notas, carpeta_id, created_at)
        SELECT id, fecha, torneo, fase, COALESCE(jugador1_nombre,''), COALESCE(jugador2_nombre,''), video_tipo, video_url, resultado, notas, carpeta_id, created_at
        FROM partidos;
      `);
      db.exec('DROP TABLE partidos;');
      db.exec('ALTER TABLE partidos_new RENAME TO partidos;');
    }

    if (needsAcciones) {
      db.exec(`
        CREATE TABLE acciones_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          partido_id INTEGER NOT NULL,
          jugador_nombre TEXT NOT NULL DEFAULT '',
          complejo TEXT NOT NULL DEFAULT 'K1',
          tipo_accion TEXT NOT NULL,
          subtipo TEXT DEFAULT '',
          resultado TEXT DEFAULT 'continuidad',
          set_numero INTEGER DEFAULT 1,
          marcador_local TEXT DEFAULT '0',
          marcador_rival TEXT DEFAULT '0',
          video_timestamp REAL DEFAULT 0,
          zona_campo TEXT DEFAULT '',
          es_favorito INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE
        );
      `);
      db.exec(`
        INSERT INTO acciones_new (id, partido_id, jugador_nombre, complejo, tipo_accion, subtipo, resultado, set_numero, marcador_local, marcador_rival, video_timestamp, zona_campo, es_favorito, created_at)
        SELECT id, partido_id, COALESCE(jugador_nombre,''), complejo, tipo_accion, subtipo, resultado, set_numero, marcador_local, marcador_rival, video_timestamp, zona_campo, COALESCE(es_favorito,0), created_at
        FROM acciones;
      `);
      db.exec('DROP TABLE acciones;');
      db.exec('ALTER TABLE acciones_new RENAME TO acciones;');
    }
  });
  migrar();
  db.pragma('foreign_keys = ON');
}

export function getDB() {
  return db;
}
