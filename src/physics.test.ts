import test from 'node:test';
import assert from 'node:assert/strict';
import {Physics,initPhysics} from './physics.ts';
import {ARENAS,getArenaRamps} from './arenas.ts';

test('Rapier keeps the character grounded and traverses ramps in every arena',async()=>{
  await initPhysics();
  const dt=1/120;
  for(const arena of ARENAS){
    const world=new Physics(arena);
    let verticalVelocity=0;
    // Match Game.simulate: integrate gravity and reset vertical velocity on support.
    const step=(forward=0)=>{
      verticalVelocity-=25*dt;
      world.move(0,verticalVelocity*dt,forward,dt);
      if(world.grounded)verticalVelocity=0;
    };
    try{
      for(let i=0;i<80;i++)step();
      assert.equal(world.grounded,true,arena.name+' grounded');
      assert.ok(world.body.translation().y>.8);
      const ramp=getArenaRamps(arena)[0];
      world.teleport(ramp.x,ramp.z+ramp.d/2+.15);
      verticalVelocity=0;
      for(let i=0;i<10;i++)step();
      for(let i=0;i<Math.ceil((ramp.d+1)/.05);i++)step(-.05);
      assert.ok(world.body.translation().y>=ramp.h+.7,arena.name+' ramp climbed');
      assert.equal(world.grounded,true,arena.name+' grounded after climbing');
      for(let i=0;i<Math.ceil((ramp.d+2)/.05);i++)step(.05);
      assert.ok(world.body.translation().z>ramp.z+ramp.d/2,arena.name+' ramp descended');
      assert.ok(world.body.translation().y<1.3,arena.name+' returned to lower lane');
      assert.equal(world.grounded,true,arena.name+' grounded after descent');
    }finally{world.dispose();}
  }
});
