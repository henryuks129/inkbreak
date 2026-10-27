import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTROL_ACTIONS,DEFAULT_BINDINGS,normalizeBindings,rebind} from './control-bindings.ts';

test('saved bindings stay complete and reject reserved or duplicated keys',()=>{
  const bindings=normalizeBindings({forward:'KeyI',fire:'KeyI',jump:'Escape',slide:'KeyV'});
  assert.equal(bindings.forward,'KeyI');assert.equal(bindings.fire,DEFAULT_BINDINGS.fire);
  assert.equal(bindings.jump,DEFAULT_BINDINGS.jump);assert.equal(bindings.slide,'KeyV');
  assert.equal(Object.keys(bindings).length,CONTROL_ACTIONS.length);
  assert.equal(rebind(bindings,'fire','KeyI'),null);assert.equal(rebind(bindings,'fire','Escape'),null);
  assert.equal(rebind(bindings,'fire','KeyK')?.fire,'KeyK');
});
