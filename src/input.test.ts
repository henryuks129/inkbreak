import test from 'node:test';
import assert from 'node:assert/strict';
import {Input} from './input.ts';
test('focus loss clears held movement/fire and releases gameplay input',()=>{
 const win=new EventTarget();const doc=Object.assign(new EventTarget(),{pointerLockElement:null as unknown,hidden:false});
 Object.assign(globalThis,{window:win,document:doc});
 const canvas={requestPointerLock:async()=>{doc.pointerLockElement=canvas;}};
 const input=new Input(canvas as unknown as HTMLCanvasElement);let pauses=0;input.onPause=()=>pauses++;
 doc.pointerLockElement=canvas;
 win.dispatchEvent(Object.assign(new Event('keydown'),{code:'KeyW'}));win.dispatchEvent(Object.assign(new Event('mousedown'),{button:0}));
 assert.equal(input.down('KeyW'),true);assert.equal(input.firing,true);
 win.dispatchEvent(new Event('blur'));assert.equal(input.down('KeyW'),false);assert.equal(input.firing,false);assert.equal(pauses,1);
 doc.pointerLockElement=null;win.dispatchEvent(Object.assign(new Event('keydown'),{code:'KeyW'}));assert.equal(input.down('KeyW'),false);
 input.dispose();doc.pointerLockElement=canvas;win.dispatchEvent(Object.assign(new Event('keydown'),{code:'KeyW'}));win.dispatchEvent(new Event('blur'));assert.equal(input.down('KeyW'),false);assert.equal(pauses,1);
});

test('jump and camera presses are consumed once and reset with focus',()=>{
 const win=new EventTarget();const doc=Object.assign(new EventTarget(),{pointerLockElement:null as unknown,hidden:false});
 Object.assign(globalThis,{window:win,document:doc});const canvas={};doc.pointerLockElement=canvas;
 const input=new Input(canvas as HTMLCanvasElement);
 const press=(code:string)=>win.dispatchEvent(Object.assign(new Event('keydown'),{code,preventDefault(){}}));
 press('Space');assert.equal(input.consume('Space'),true);assert.equal(input.consume('Space'),false);
 press('Space');assert.equal(input.consume('Space'),false);
 win.dispatchEvent(Object.assign(new Event('keyup'),{code:'Space'}));press('Space');assert.equal(input.consume('Space'),true);
 press('KeyC');input.clear();assert.equal(input.consume('KeyC'),false);input.dispose();
});
