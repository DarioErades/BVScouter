import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularStats } from '../src/utils/stats-calculator.js';
import { actionsForReview, reviewCategories } from '../src/utils/scouting-review.js';

test('el cálculo de estadísticas no muta las acciones de entrada', () => {
  const acciones = [
    { jugador_nombre: 'Ana', tipo_accion: 'recepcion', resultado: 'continuidad', set_numero: 1, marcador_local: '0', marcador_rival: '0', complejo: 'K1' },
    { jugador_nombre: 'Ana', tipo_accion: 'ataque', resultado: 'punto', set_numero: 1, marcador_local: '0', marcador_rival: '0', complejo: 'K1' }
  ];
  calcularStats(acciones, 'Ana', 'Bea');
  assert.ok(acciones.every(action => !Object.hasOwn(action, '_fase')));
});

test('las colas de revisión clasifican favoritos y errores K1', () => {
  const acciones = [
    { id: 1, es_favorito: 1, resultado: 'punto', complejo: 'K2' },
    { id: 2, es_favorito: 0, resultado: 'error', complejo: 'K1' },
    { id: 3, es_favorito: 0, resultado: 'continuidad', complejo: 'K1' }
  ];
  assert.equal(actionsForReview(acciones, 'favorites').length, 1);
  assert.deepEqual(actionsForReview(acciones, 'k1-errors').map(a => a.id), [2]);
  assert.equal(reviewCategories(acciones).find(c => c.id === 'errors').count, 1);
});
