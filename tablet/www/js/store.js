// Persistencia local (localStorage dentro del WebView de Android).
const KEY = 'volleystats.tablet.v1';
const vacio = () => ({ matches: [], lastRoster: [], lastTeam: '' });

function leer() {
  try { return JSON.parse(localStorage.getItem(KEY)) || vacio(); } catch (e) { return vacio(); }
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

export const getPrefs = () => ({ team: db.lastTeam, roster: db.lastRoster });

export function setPrefs(team, roster) {
  db.lastTeam = team;
  db.lastRoster = roster.map(({ dorsal, name, pos }) => ({ dorsal, name, pos }));
  escribir();
}
