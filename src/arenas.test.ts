import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENAS,getArenaRamps,getRampVertices,getArenaShelters} from './arenas.ts';
test('all four arenas have clear playable spawns and matching gradual ramp hulls',()=>{
 assert.equal(ARENAS.length,4);assert.equal(new Set(ARENAS.map(a=>a.id)).size,4);
 for(const a of ARENAS){
  for(const [x,z] of [a.spawn,...a.botSpawns])assert.equal(a.obstacles.some(b=>Math.abs(x-b.x)<b.w/2+.5&&Math.abs(z-b.z)<b.d/2+.5),false,a.name+' spawn');
  const ramps=getArenaRamps(a);assert.equal(ramps.length,2);
  ramps.forEach((r,i)=>{assert.equal(getRampVertices(r).length,18);assert.ok(r.z+r.d/2<=29);assert.ok(r.h/r.d<1);assert.ok(Math.abs(r.z-r.d/2-(a.obstacles[i].z+a.obstacles[i].d/2))<1e-6);});
 }
});

test('every arena has four open, spawn-safe side shelters with no embedded walls',()=>{
 for(const arena of ARENAS){
  const shelters=getArenaShelters(arena);
  assert.equal(shelters.length,8,arena.name);
  const previous=arena.obstacles.slice(0,-shelters.length);
  for(const wall of shelters){
   assert.ok(wall.h>=2,'standing-height cover');
   assert.ok(Math.abs(wall.x)+wall.w/2<30,'inside boundary');
   for(const [x,z] of [arena.spawn,...arena.botSpawns])assert.ok(Math.abs(x-wall.x)>=wall.w/2+.42||Math.abs(z-wall.z)>=wall.d/2+.42,arena.name+' spawn is clear');
   for(const block of previous){
    const overlapX=Math.min(wall.x+wall.w/2,block.x+block.w/2)-Math.max(wall.x-wall.w/2,block.x-block.w/2);
    const overlapZ=Math.min(wall.z+wall.d/2,block.z+block.d/2)-Math.max(wall.z-wall.d/2,block.z-block.d/2);
    assert.ok(overlapX<=0||overlapZ<=0,arena.name+' shelter not embedded in existing cover');
   }
  }
 }
});
