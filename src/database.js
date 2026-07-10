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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_acciones_partido ON acciones(partido_id);
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

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_acciones_jugador ON acciones(jugador_nombre);`);
  } catch(err) {}

  return db;
}

export function getDB() {
  return db;
}
