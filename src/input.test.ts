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

test('remapped movement and fire use their new keys and release cleanly',()=>{
 const win=new EventTarget(),doc=Object.assign(new EventTarget(),{pointerLockElement:null as unknown,hidden:false});
 Object.assign(globalThis,{window:win,document:doc});const canvas={};doc.pointerLockElement=canvas;
 const input=new Input(canvas as HTMLCanvasElement);input.setBindings({forward:'KeyI',fire:'KeyK'});
 const event=(type:string,code:string)=>win.dispatchEvent(Object.assign(new Event(type),{code,preventDefault(){}}));
 event('keydown','KeyW');assert.equal(input.down('KeyW'),false);
 event('keydown','KeyI');assert.equal(input.down('KeyW'),true);event('keyup','KeyI');assert.equal(input.down('KeyW'),false);
 event('keydown','KeyK');assert.equal(input.down('KeyJ'),true);event('keyup','KeyK');assert.equal(input.down('KeyJ'),false);
 input.dispose();
});

test('touch mode captures without pointer lock and clears virtual controls on focus loss',async()=>{
 const win=new EventTarget(),doc=Object.assign(new EventTarget(),{pointerLockElement:null as unknown,hidden:false});
 Object.assign(globalThis,{window:win,document:doc});
 const canvas={requestPointerLock:async()=>{throw Error('Pointer lock unavailable');}};
 const input=new Input(canvas as unknown as HTMLCanvasElement);let pauses=0;input.onPause=()=>pauses++;
 input.setTouchMode(true);assert.equal(await input.capture(),true);
 input.setVirtualMove(.6,.8);input.setVirtualHeld('KeyJ',true);input.pressVirtual('Space');input.setVirtualLook(20,-10);
 assert.equal(input.virtualX,.6);assert.equal(input.virtualY,.8);assert.equal(input.down('KeyJ'),true);assert.equal(input.consume('Space'),true);assert.notEqual(input.yaw,0);
 doc.dispatchEvent(new Event('pointerlockchange'));assert.equal(pauses,0);
 win.dispatchEvent(new Event('blur'));assert.equal(pauses,1);assert.equal(input.virtualX,0);assert.equal(input.down('KeyJ'),false);
 input.dispose();
});
