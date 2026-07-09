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
    CREATE TABLE IF NOT EXISTS jugadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      nacionalidad TEXT DEFAULT '',
      posicion TEXT DEFAULT '',
      notas TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS partidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      torneo TEXT DEFAULT '',
      fase TEXT DEFAULT '',
      jugador1_id INTEGER NOT NULL,
      jugador2_id INTEGER NOT NULL,
      video_tipo TEXT DEFAULT 'local',
      video_url TEXT DEFAULT '',
      resultado TEXT DEFAULT '',
      notas TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (jugador1_id) REFERENCES jugadores(id),
      FOREIGN KEY (jugador2_id) REFERENCES jugadores(id)
    );

    CREATE TABLE IF NOT EXISTS acciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partido_id INTEGER NOT NULL,
      jugador_id INTEGER NOT NULL,
      complejo TEXT NOT NULL DEFAULT 'K1',
      tipo_accion TEXT NOT NULL,
      subtipo TEXT DEFAULT '',
      resultado TEXT DEFAULT 'continuidad',
      set_numero INTEGER DEFAULT 1,
      marcador_local TEXT DEFAULT '0',
      marcador_rival TEXT DEFAULT '0',
      video_timestamp REAL DEFAULT 0,
      zona_campo TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (partido_id) REFERENCES partidos(id),
      FOREIGN KEY (jugador_id) REFERENCES jugadores(id)
    );

    CREATE TABLE IF NOT EXISTS carpetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec(`ALTER TABLE partidos ADD COLUMN carpeta_id INTEGER REFERENCES carpetas(id)`);
  } catch (err) {
    // La columna ya existe
  }

  return db;
}

export function getDB() {
  return db;
}
