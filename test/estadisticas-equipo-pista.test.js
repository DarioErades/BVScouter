import test from 'node:test';
import assert from 'node:assert/strict';
import { analizarEquipo } from '../src/utils/estadisticas-equipo-pista.js';
import { buscarEquipoCoincidente } from '../src/utils/equipos-vinculo-pista.js';

let id = 0;
const a = (tipo, resultado, dorsal, pre, post, extra = {}) => ({
  id: ++id, set_numero: 1, tipo_accion: tipo, resultado, dorsal, subtipo: '', rotacion: 1, scouting_version: 2,
  marcador_pre_local: String(pre[0]), marcador_pre_rival: String(pre[1]), marcador_local: String(post[0]), marcador_rival: String(post[1]), ...extra
});

const acciones = [
  a('recepcion', '+', 5, [0, 0], [0, 0]),
  a('ataque', '#', 9, [0, 0], [1, 0]),            // side-out tras recepción buena → 9
  a('saque', '#', 7, [1, 0], [2, 0]),             // ace
  a('recepcion', '!', 5, [2, 0], [2, 0]),
  a('ataque', '=', 4, [2, 0], [2, 1]),            // tras recepción mala → 4 falla
  { ...a('fin_set', 'local', 0, [0, 0], [25, 20]), subtipo: 'Ganador Set' }
];

test('reparto de colocación según la calidad de la recepción', () => {
  const r = analizarEquipo([{ id: 1, fecha: '2026-01-01', rival_nombre: 'X', acciones, roster: [{ dorsal: 5 }, { dorsal: 9 }, { dorsal: 4 }, { dorsal: 7 }] }]);
  assert.equal(r.colocacion.recBuena.total, 1);
  assert.equal(r.colocacion.recBuena.jugadores[0].dorsal, 9);
  assert.equal(r.colocacion.recMala.jugadores[0].dorsal, 4);
  assert.deepEqual([r.global.so.total, r.global.so.ganados, r.global.bp.total, r.global.bp.ganados], [1, 1, 2, 1]); // el 3er punto lo saca el equipo que ganó el anterior (nosotros)
  assert.equal(r.victorias, 1);
  assert.equal(r.ganamos['Ace'], 1);
  assert.equal(r.perdemos['Error de ataque'], 1);
});

test('reconoce el equipo por id, nombre o plantilla', () => {
  const pc = [{ id: 1, nombre: 'CV Niza', jugadores: [1, 2, 3, 4, 5].map((d) => ({ dorsal: d, nombre: `Jugador ${d}` })) }];
  assert.equal(buscarEquipoCoincidente(pc, new Map([['u', 1]]), { uid: 'u', nombre: 'otro', roster: [] }).metodo, 'id');
  assert.equal(buscarEquipoCoincidente(pc, new Map(), { nombre: 'cv  niza', roster: [] }).metodo, 'nombre');
  const porPlantilla = buscarEquipoCoincidente(pc, new Map(), { nombre: 'Senior', roster: [1, 2, 3, 4].map((d) => ({ dorsal: d, nombre: `jugador ${d}` })) });
  assert.equal(porPlantilla.metodo, 'plantilla');
  assert.equal(buscarEquipoCoincidente(pc, new Map(), { nombre: 'Distinto', roster: [{ dorsal: 1, nombre: 'Zzz' }] }), null);
});
