import test from 'node:test';
import assert from 'node:assert/strict';
import {stickVector,supportsTouchControls} from './mobile-controls.ts';

test('touch stick ignores resting jitter, preserves direction, and caps diagonal speed',()=>{
  assert.deepEqual(stickVector(100,100,106,105,80),{x:0,y:0});
  assert.deepEqual(stickVector(100,100,100,20,80),{x:0,y:1});
  const diagonal=stickVector(100,100,200,0,80);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-10);
  assert.ok(diagonal.x>0&&diagonal.y>0);
  assert.deepEqual(stickVector(0,0,30,30,0),{x:0,y:0});
});

test('touch UI is enabled by coarse pointer or a touch-capable device',()=>{
  const fine={matchMedia:()=>({matches:false})} as unknown as Pick<Window,'matchMedia'>;
  const coarse={matchMedia:()=>({matches:true})} as unknown as Pick<Window,'matchMedia'>;
  assert.equal(supportsTouchControls(fine,0),false);
  assert.equal(supportsTouchControls(fine,5),true);
  assert.equal(supportsTouchControls(coarse,0),true);
});
