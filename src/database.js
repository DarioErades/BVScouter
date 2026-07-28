import initSqlJs from 'sql.js';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

let db = null;
let dbPista = null;
let globalSQL = null;

class StatementWrapper {
  constructor(dbWrapper, sql) {
    this.dbWrapper = dbWrapper;
    this.sql = sql;
  }

  _bindAndExecute(params) {
    const rawDb = this.dbWrapper.rawDb;
    let boundParams = [];

    if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
      const obj = params[0];
      const sqlParams = {};
      for (const [k, v] of Object.entries(obj)) {
        const val = v === undefined ? null : v;
        sqlParams[k.startsWith('@') || k.startsWith(':') || k.startsWith('$') ? k : `@${k}`] = val;
        sqlParams[k.startsWith('@') || k.startsWith(':') || k.startsWith('$') ? k : `:${k}`] = val;
        sqlParams[k.startsWith('@') || k.startsWith(':') || k.startsWith('$') ? k : `$${k}`] = val;
      }
      boundParams = [sqlParams];
    } else if (params.length === 1 && Array.isArray(params[0])) {
      boundParams = params[0];
    } else {
      boundParams = params;
    }

    const stmt = rawDb.prepare(this.sql);
    if (boundParams.length > 0) {
      if (typeof boundParams[0] === 'object' && boundParams[0] !== null && !Array.isArray(boundParams[0])) {
        stmt.bind(boundParams[0]);
      } else {
        stmt.bind(boundParams);
      }
    }
    return stmt;
  }

  all(...params) {
    const stmt = this._bindAndExecute(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  get(...params) {
    const stmt = this._bindAndExecute(params);
    let result = undefined;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  }

  run(...params) {
    const rawDb = this.dbWrapper.rawDb;
    const stmt = this._bindAndExecute(params);
    stmt.step();
    stmt.free();

    const changesRes = rawDb.exec('SELECT changes() AS changes, last_insert_rowid() AS id');
    let changes = 0;
    let lastInsertRowid = 0;
    if (changesRes.length > 0 && changesRes[0].values.length > 0) {
      changes = changesRes[0].values[0][0];
      lastInsertRowid = changesRes[0].values[0][1];
    }

    this.dbWrapper.save();
    return { changes, lastInsertRowid };
  }
}

class DatabaseWasm {
  constructor(dbPath, rawDb) {
    this.name = dbPath;
    this.rawDb = rawDb;
    this._inTransaction = false;
  }

  save() {
    if (this._inTransaction) return;
    if (this.name && this.name !== ':memory:') {
      const data = this.rawDb.export();
      // Evita dejar una base de datos truncada si el proceso se interrumpe en
      // mitad de una escritura (por ejemplo, al cerrar el portátil).
      const tempPath = `${this.name}.tmp`;
      fs.writeFileSync(tempPath, Buffer.from(data));
      fs.renameSync(tempPath, this.name);
    }
  }

  exec(sql) {
    this.rawDb.exec(sql);
    this.save();
  }

  pragma(pragmaStr) {
    try {
      return this.rawDb.exec(`PRAGMA ${pragmaStr}`);
    } catch (e) {
      return [];
    }
  }

  prepare(sql) {
    return new StatementWrapper(this, sql);
  }

  transaction(fn) {
    return (...args) => {
      this._inTransaction = true;
      this.rawDb.exec('BEGIN TRANSACTION');
      try {
        const res = fn(...args);
        this.rawDb.exec('COMMIT');
        this._inTransaction = false;
        this.save();
        return res;
      } catch (err) {
        this.rawDb.exec('ROLLBACK');
        this._inTransaction = false;
        throw err;
      }
    };
  }

  async backup(destPath) {
    const data = this.rawDb.export();
    fs.writeFileSync(destPath, Buffer.from(data));
    return true;
  }

  close() {
    this.save();
    this.rawDb.close();
  }
}

export async function initDatabase() {
  if (!globalSQL) {
    globalSQL = await initSqlJs();
  }
  const SQL = globalSQL;
  const dbPath = path.join(app.getPath('userData'), 'bvscouter.db');

  let rawDb;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    rawDb = new SQL.Database(fileBuffer);
  } else {
    rawDb = new SQL.Database();
  }

  db = new DatabaseWasm(dbPath, rawDb);

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
      marcador_pre_local TEXT DEFAULT '0',
      marcador_pre_rival TEXT DEFAULT '0',
      equipo_al_saque TEXT DEFAULT 'local',
      scouting_version INTEGER DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS jugadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL DEFAULT '',
      apellidos TEXT DEFAULT '',
      nacionalidad TEXT DEFAULT '',
      posicion TEXT DEFAULT '',
      notas TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations_playa (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);
  const hasColumn = (table, column) => db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
  const applyMigration = (version, changes) => {
    if (db.prepare('SELECT version FROM schema_migrations_playa WHERE version = ?').get(version)) return;
    db.transaction(() => {
      changes.forEach(({ table, column, definition }) => {
        if (!hasColumn(table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      });
      db.prepare('INSERT INTO schema_migrations_playa (version) VALUES (?)').run(version);
    })();
  };
  applyMigration(1, [
    { table: 'partidos', column: 'carpeta_id', definition: 'INTEGER REFERENCES carpetas(id) ON DELETE SET NULL' },
    { table: 'partidos', column: 'jugador1_nombre', definition: "TEXT DEFAULT ''" },
    { table: 'partidos', column: 'jugador2_nombre', definition: "TEXT DEFAULT ''" },
    { table: 'acciones', column: 'jugador_nombre', definition: "TEXT DEFAULT ''" }
  ]);
  try {
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

  applyMigration(2, [
    { table: 'acciones', column: 'es_favorito', definition: 'INTEGER DEFAULT 0' },
    { table: 'partidos', column: 'finalizado', definition: 'INTEGER DEFAULT 0' }
  ]);

  // La migración estructural se conserva para instalaciones antiguas que
  // guardaban IDs de jugador. A partir de ahora las migraciones quedan
  // registradas y se ejecutan una sola vez.
  if (!db.prepare('SELECT version FROM schema_migrations_playa WHERE version = ?').get(3)) {
    migrarEsquemaSinIds(db);
    db.prepare('INSERT INTO schema_migrations_playa (version) VALUES (?)').run(3);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_acciones_partido ON acciones(partido_id);
    CREATE INDEX IF NOT EXISTS idx_acciones_jugador ON acciones(jugador_nombre);
    CREATE INDEX IF NOT EXISTS idx_partidos_carpeta ON partidos(carpeta_id);
  `);

  return db;
}

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

export async function initDatabasePista() {
  if (!globalSQL) {
    globalSQL = await initSqlJs();
  }
  const SQL = globalSQL;
  const dbPath = path.join(app.getPath('userData'), 'bvscouter_pista.db');

  let rawDb;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    rawDb = new SQL.Database(fileBuffer);
  } else {
    rawDb = new SQL.Database();
  }

  dbPista = new DatabaseWasm(dbPath, rawDb);

  dbPista.pragma('foreign_keys = ON');

  dbPista.exec(`
    CREATE TABLE IF NOT EXISTS equipos_pista (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      abreviatura TEXT DEFAULT '',
      notas TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS jugadores_pista (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipo_id INTEGER NOT NULL,
      dorsal INTEGER NOT NULL CHECK(dorsal >= 0 AND dorsal <= 99),
      nombre TEXT DEFAULT '',
      apellidos TEXT DEFAULT '',
      posicion TEXT DEFAULT '',
      es_libero INTEGER DEFAULT 0,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipo_id) REFERENCES equipos_pista(id) ON DELETE CASCADE,
      UNIQUE(equipo_id, dorsal)
    );

    CREATE TABLE IF NOT EXISTS carpetas_pista (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS partidos_pista (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      torneo TEXT DEFAULT '',
      fase TEXT DEFAULT '',
      equipo_id INTEGER,
      equipo_nombre TEXT NOT NULL DEFAULT '',
      rival_nombre TEXT NOT NULL DEFAULT '',
      video_tipo TEXT DEFAULT 'local',
      video_url TEXT DEFAULT '',
      resultado TEXT DEFAULT '',
      resultado_parciales TEXT DEFAULT '',
      notas TEXT DEFAULT '',
      finalizado INTEGER DEFAULT 0,
      carpeta_id INTEGER REFERENCES carpetas_pista(id) ON DELETE SET NULL,
      llevar_rotaciones INTEGER DEFAULT 0,
      rotaciones_iniciales TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipo_id) REFERENCES equipos_pista(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS roster_partido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partido_id INTEGER NOT NULL,
      dorsal INTEGER NOT NULL,
      nombre TEXT DEFAULT '',
      apellidos TEXT DEFAULT '',
      posicion TEXT DEFAULT '',
      es_libero INTEGER DEFAULT 0,
      jugador_pista_id INTEGER,
      FOREIGN KEY (partido_id) REFERENCES partidos_pista(id) ON DELETE CASCADE,
      FOREIGN KEY (jugador_pista_id) REFERENCES jugadores_pista(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS acciones_pista (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partido_id INTEGER NOT NULL,
      dorsal INTEGER NOT NULL,
      rotacion INTEGER DEFAULT 1,
      tipo_accion TEXT NOT NULL,
      subtipo TEXT DEFAULT '',
      resultado TEXT NOT NULL DEFAULT '#',
      set_numero INTEGER DEFAULT 1,
      marcador_local TEXT DEFAULT '0',
      marcador_rival TEXT DEFAULT '0',
      video_timestamp REAL DEFAULT 0,
      zona_origen INTEGER DEFAULT 0,
      zona_destino INTEGER DEFAULT 0,
      es_favorito INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (partido_id) REFERENCES partidos_pista(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_acciones_pista_partido ON acciones_pista(partido_id);
    CREATE INDEX IF NOT EXISTS idx_acciones_pista_dorsal ON acciones_pista(dorsal);
    CREATE INDEX IF NOT EXISTS idx_jugadores_pista_equipo ON jugadores_pista(equipo_id);
    CREATE INDEX IF NOT EXISTS idx_partidos_pista_carpeta ON partidos_pista(carpeta_id);
    CREATE INDEX IF NOT EXISTS idx_roster_partido ON roster_partido(partido_id);
  `);

  dbPista.exec(`CREATE TABLE IF NOT EXISTS schema_migrations_pista (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);

  const hasColumn = (table, column) => dbPista.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
  const applyMigration = (version, changes) => {
    if (dbPista.prepare('SELECT version FROM schema_migrations_pista WHERE version = ?').get(version)) return;
    dbPista.transaction(() => {
      changes.forEach(({ table, column, definition }) => {
        if (!hasColumn(table, column)) dbPista.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      });
      dbPista.prepare('INSERT INTO schema_migrations_pista (version) VALUES (?)').run(version);
    })();
  };

  applyMigration(1, [
    { table: 'partidos_pista', column: 'llevar_rotaciones', definition: 'INTEGER DEFAULT 0' },
    { table: 'partidos_pista', column: 'rotaciones_iniciales', definition: "TEXT DEFAULT '{}'" }
  ]);
  applyMigration(2, [
    { table: 'acciones_pista', column: 'marcador_pre_local', definition: "TEXT DEFAULT '0'" },
    { table: 'acciones_pista', column: 'marcador_pre_rival', definition: "TEXT DEFAULT '0'" },
    { table: 'acciones_pista', column: 'equipo_al_saque', definition: "TEXT DEFAULT 'local'" }
  ]);
  applyMigration(3, [
    { table: 'acciones_pista', column: 'scouting_version', definition: 'INTEGER DEFAULT 0' }
  ]);

  return dbPista;
}

export function getDBPista() {
  return dbPista;
}
