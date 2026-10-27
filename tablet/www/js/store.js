// Persistencia local (localStorage dentro del WebView de Android).
import { uid } from './engine.js';

const KEY = 'volleystats.tablet.v1';
const vacio = () => ({ matches: [], teams: [], ultimoModo: 'complejo', ultimoEquipoId: '' });

function leer() {
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)) || vacio(); } catch (e) { return vacio(); }
  if (!db.teams) db.teams = [];
  // Compatibilidad con versiones antiguas (una sola plantilla "recordada", sin equipos guardados).
  if (!db.teams.length && db.lastTeam) {
    const t = { id: uid(), name: db.lastTeam, roster: db.lastRoster || [] };
    db.teams.push(t);
    db.ultimoEquipoId = t.id;
  }
  if (!db.ultimoModo) db.ultimoModo = db.lastModo || 'complejo';
  return db;
}
let db = leer();

function escribir() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('No se pudo guardar', e); }
}

export const listMatches = () => [...db.matches].sort((a, b) => b.createdAt - a.createdAt);
export const getMatch = (id) => db.matches.find((m) => m.id === id);

export function saveMatch(m) {
  const i = db.matches.findIndex((x) => x.id === m.id);
  if (i < 0) db.matches.push(m); else db.matches[i] = m;
  escribir();
}

export function deleteMatch(id) {
  db.matches = db.matches.filter((m) => m.id !== id);
  escribir();
}

export const listTeams = () => [...db.teams].sort((a, b) => a.name.localeCompare(b.name, 'es'));
export const getTeam = (id) => db.teams.find((t) => t.id === id);

export function saveTeam(team) {
  const t = { id: team.id || uid(), name: team.name, roster: team.roster };
  const i = db.teams.findIndex((x) => x.id === t.id);
  if (i < 0) db.teams.push(t); else db.teams[i] = t;
  escribir();
  return t;
}

export function deleteTeam(id) {
  db.teams = db.teams.filter((t) => t.id !== id);
  if (db.ultimoEquipoId === id) db.ultimoEquipoId = '';
  escribir();
}

export const getUltimoModo = () => db.ultimoModo || 'complejo';
export function setUltimoModo(modo) {
  if (modo === 'simple' || modo === 'complejo') { db.ultimoModo = modo; escribir(); }
}

export const getUltimoEquipoId = () => db.ultimoEquipoId || '';
export function setUltimoEquipo(id) {
  db.ultimoEquipoId = id;
  escribir();
}

// Vista de la pantalla en directo: 'filas' (una fila por jugador) o 'campo' (jugadores en la pista).
export const getVistaLive = () => (db.vistaLive === 'campo' ? 'campo' : 'filas');
export function setVistaLive(v) {
  db.vistaLive = v === 'campo' ? 'campo' : 'filas';
  escribir();
}
