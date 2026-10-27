import test from 'node:test';
import assert from 'node:assert/strict';
import { resumirRallies, siguientePunto, cierraPunto } from '../src/utils/rallies-pista.js';
import { resolverPunto, aplicarPunto, rotarAdelante, rotarAtras, slotEnPosicion } from '../src/utils/scoring-pista.js';

// Acciones de un set con marcadores previos/posteriores (scouting_version 2).
const a = (id, tipo, resultado, pre, post, extra = {}) => ({
  id, set_numero: 1, tipo_accion: tipo, resultado, subtipo: '', rotacion: 1, scouting_version: 2,
  marcador_pre_local: String(pre[0]), marcador_pre_rival: String(pre[1]),
  marcador_local: String(post[0]), marcador_rival: String(post[1]), ...extra
});

const set = [
  a(1, 'recepcion', '+', [0, 0], [0, 0]),
  a(2, 'ataque', '#', [0, 0], [1, 0]),               // punto 1: side-out (rival sacaba)
  a(3, 'saque', '+', [1, 0], [1, 0]),
  a(4, 'rival', '#', [1, 0], [1, 1])                 // punto 2: nuestro saque, lo pierde
];

test('sin punto_num se deducen los rallies con los marcadores', () => {
  const rs = resumirRallies(set);
  assert.equal(rs.length, 2);
  assert.deepEqual(rs.map((r) => r.ganador), ['local', 'rival']);
  assert.deepEqual(rs.map((r) => r.saqueInicio), ['rival', 'local']);
  assert.deepEqual(rs[1].marcador, { local: 1, rival: 1 });
});

test('con punto_num se agrupa por número aunque falten acciones', () => {
  const conNum = set.map((x, i) => ({ ...x, punto_num: i < 2 ? 1 : 2, saque_inicio: i < 2 ? 'rival' : 'local' }));
  // quitamos la recepción (p. ej. sin tiempo de vídeo): el rally 1 sigue siendo uno
  const rs = resumirRallies(conNum.filter((x) => x.id !== 1));
  assert.equal(rs.length, 2);
  assert.equal(rs[0].acciones.length, 1);
  assert.equal(rs[0].saqueInicio, 'rival');
});

test('siguientePunto continúa el rally abierto o abre el siguiente', () => {
  assert.deepEqual(siguientePunto([]), { punto_num: 1, saque_inicio: 'local' });
  assert.deepEqual(siguientePunto(set.slice(0, 1)), { punto_num: 1, saque_inicio: 'rival' }); // una recepción implica que sacaba el rival
  assert.deepEqual(siguientePunto(set.slice(0, 2)), { punto_num: 2, saque_inicio: 'local' });
  assert.deepEqual(siguientePunto(set), { punto_num: 3, saque_inicio: 'rival' });
});

test('cierraPunto usa el marcador y no solo el resultado', () => {
  assert.equal(cierraPunto(a(9, 'ataque', '-', [3, 3], [3, 3])), false);
  assert.equal(cierraPunto(a(9, 'ataque', '=', [3, 3], [3, 4])), true);
  assert.equal(cierraPunto({ tipo_accion: 'cambio' }), false);
});

test('resolverPunto: quién anota según la acción', () => {
  assert.equal(resolverPunto('ataque', '#').anota, 'local');
  assert.equal(resolverPunto('ataque', '/').anota, 'rival');
  assert.equal(resolverPunto('recepcion', '=').anota, 'rival');
  assert.equal(resolverPunto('recepcion', '+').anota, null);
  assert.equal(resolverPunto('error_general', '=').anota, 'rival');
  const r = resolverPunto('rival', '=');
  assert.deepEqual(r, { anota: 'local', resultado: '=', subtipo: 'Error Rival' });
});

test('aplicarPunto rota solo al recuperar el saque', () => {
  const base = { marcadorLocal: 5, marcadorRival: 5, equipoAlSaque: 'rival', rotacionActual: 1 };
  assert.deepEqual(aplicarPunto(base, 'local'), { marcadorLocal: 6, marcadorRival: 5, equipoAlSaque: 'local', rotacionActual: 6 });
  assert.deepEqual(aplicarPunto({ ...base, equipoAlSaque: 'local' }, 'local').rotacionActual, 1);
  assert.deepEqual(aplicarPunto({ ...base, equipoAlSaque: 'local' }, 'rival'), { marcadorLocal: 5, marcadorRival: 6, equipoAlSaque: 'rival', rotacionActual: 1 });
});

test('rotar adelante y atrás son inversas y cubren las 6 posiciones', () => {
  for (let r = 1; r <= 6; r++) assert.equal(rotarAtras(rotarAdelante(r)), r);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((p) => slotEnPosicion(p, 1)), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((p) => slotEnPosicion(p, 6)).sort(), ['1', '2', '3', '4', '5', '6'].map(Number).sort());
});

import { rendimientoPorRotacion, resumenSet } from '../src/utils/rallies-pista.js';

test('rendimiento por rotación separa recibiendo y sacando', () => {
  const rs = resumirRallies([
    ...set,
    a(5, 'recepcion', '+', [1, 1], [1, 1], { rotacion: 6 }),
    a(6, 'ataque', '=', [1, 1], [1, 2], { rotacion: 6 })
  ]);
  const filas = rendimientoPorRotacion(rs);
  assert.deepEqual(filas[0].recibiendo, { ganados: 1, total: 1 }); // rot 1, side-out ganado
  assert.deepEqual(filas[0].sacando, { ganados: 0, total: 1 });    // rot 1, saque perdido
  assert.deepEqual(filas[5].recibiendo, { ganados: 0, total: 1 }); // rot 6, side-out perdido
});

test('resumenSet calcula rachas y ventaja máxima', () => {
  const r = resumenSet(resumirRallies(set));
  assert.equal(r.puntos, 2);
  assert.equal(r.rachaLocal, 1);
  assert.equal(r.ventajaLocal, 1);
  assert.equal(r.ventajaRival, 0);
});
