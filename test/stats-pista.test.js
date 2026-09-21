import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularStatsPista } from '../src/utils/stats-calculator-pista.js';

const roster = [{ dorsal: 1, nombre: 'Ana' }, { dorsal: 2, nombre: 'Bea' }, { dorsal: 3, nombre: 'Cris' }];
const accion = (id, dorsal, tipo_accion, resultado) => ({ id, dorsal, tipo_accion, resultado, set_numero: 1, marcador_local: '0', marcador_rival: '0' });

test('el voto pesa cada acción por su efecto y va de 0 a 10', () => {
  const acciones = [
    ...Array.from({ length: 20 }, (_, i) => accion(i + 1, 1, 'ataque', '#')),
    ...Array.from({ length: 20 }, (_, i) => accion(100 + i, 2, 'ataque', '=')),
    ...Array.from({ length: 20 }, (_, i) => accion(200 + i, 3, 'recepcion', '+'))
  ];
  const { porJugador } = calcularStatsPista(acciones, roster);
  assert.ok(porJugador[1].voto > 9 && porJugador[1].voto <= 10);
  assert.ok(porJugador[2].voto >= 0 && porJugador[2].voto < 1.5);
  assert.ok(porJugador[3].voto > 7 && porJugador[3].voto < 8.5);
});

test('con pocas acciones el voto se acerca a la media y sin acciones es 0', () => {
  const { porJugador } = calcularStatsPista([accion(1, 1, 'saque', '=')], roster);
  assert.ok(porJugador[1].voto > 4 && porJugador[1].voto < 6);
  assert.equal(porJugador[2].voto, 0);
});

test('bloquear o defender también cuenta para el voto', () => {
  const { porJugador } = calcularStatsPista([accion(1, 1, 'bloqueo', '#'), accion(2, 1, 'defensa', '+')], roster);
  assert.ok(porJugador[1].voto > 6);
});
