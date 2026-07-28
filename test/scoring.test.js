import test from 'node:test';
import assert from 'node:assert/strict';
import { applyScoreDelta, scoreDeltaForResult, scoreFromActions, scoreToString } from '../src/utils/scoring.js';

test('un punto propio y un error propio se reflejan en lados opuestos', () => {
  assert.deepEqual(scoreDeltaForResult('punto'), { local: 1, rival: 0 });
  assert.deepEqual(scoreDeltaForResult('error'), { local: 0, rival: 1 });
  assert.deepEqual(scoreDeltaForResult('continuidad'), { local: 0, rival: 0 });
});

test('el marcador no baja de cero y se deriva de las acciones', () => {
  assert.deepEqual(applyScoreDelta({ local: 0, rival: 0 }, { local: -1, rival: -1 }), { local: 0, rival: 0 });
  const score = scoreFromActions([{ resultado: 'punto' }, { resultado: 'error' }, { resultado: 'bloqueado' }]);
  assert.equal(scoreToString(score), '1-2');
});
