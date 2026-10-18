import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENAS,getArenaRamps} from './arenas.ts';
import {downhillAt} from './slide.ts';

test('every arena has an accessible downhill surface and rejects distant flat ground',()=>{
  for(const arena of ARENAS){
    const ramps=getArenaRamps(arena);assert.ok(ramps.length>=2,arena.name);
    const ramp=ramps[0],sample=downhillAt(arena,ramp.x,1.05+ramp.h/2,ramp.z);
    assert.ok(sample,arena.name);assert.ok(sample.steepness>0);assert.equal(sample.z,1);
    assert.equal(downhillAt(arena,0,1.05,0),null);
  }
});
