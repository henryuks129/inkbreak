import {CONTROL_ACTIONS,DEFAULT_BINDINGS,normalizeBindings,type ControlBindings} from './control-bindings.ts';
export class Input {
  private abort = new AbortController();
  touchMode=false;virtualX=0;virtualY=0;private virtualKeys=new Set<string>();
  keys = new Set<string>(); firing = false; yaw = 0; pitch = -.15; sensitivity = .002;
  bindings:ControlBindings=normalizeBindings(null);
  onPause: () => void = () => {};
  private pressed = new Set<string>();
  constructor(public element: HTMLCanvasElement) {
    window.addEventListener('keydown', e => {
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code) && document.pointerLockElement) e.preventDefault();
      if (document.pointerLockElement === element || this.touchMode) {const code=this.canonical(e.code);if(!this.keys.has(code))this.pressed.add(code);this.keys.add(code);}
    }, {signal:this.abort.signal});
    window.addEventListener('keyup', e => this.keys.delete(this.canonical(e.code)), {signal:this.abort.signal});
    window.addEventListener('mousemove', e => { if (document.pointerLockElement === element) { this.yaw -= e.movementX * this.sensitivity; this.pitch = Math.max(-.8, Math.min(.65, this.pitch - e.movementY * this.sensitivity)); } }, {signal:this.abort.signal});
    window.addEventListener('mousedown', e => {if (e.button === 0 && document.pointerLockElement === element) this.firing = true;}, {signal:this.abort.signal});
    window.addEventListener('mouseup', () => this.firing = false, {signal:this.abort.signal});
    document.addEventListener('pointerlockchange', () => {if (!this.touchMode&&document.pointerLockElement !== element) {this.clear(); this.onPause();}}, {signal:this.abort.signal});
    window.addEventListener('blur', () => {this.clear(); this.onPause();}, {signal:this.abort.signal});
    document.addEventListener('visibilitychange', () => {if(document.hidden) {this.clear(); this.onPause();}}, {signal:this.abort.signal});
  }
  dispose() {this.abort.abort();this.clear();}
  setBindings(value:unknown){this.bindings=normalizeBindings(value);this.clear();}
  private canonical(code:string){const action=CONTROL_ACTIONS.find(key=>this.bindings[key]===code);if(action)return DEFAULT_BINDINGS[action];return Object.values(DEFAULT_BINDINGS).includes(code as typeof DEFAULT_BINDINGS[keyof typeof DEFAULT_BINDINGS])?'Unbound:'+code:code;}
  clear() {this.keys.clear();this.pressed.clear();this.virtualKeys.clear();this.virtualX=0;this.virtualY=0;this.firing=false;}
  consume(code:string) {const pressed=this.pressed.has(code);this.pressed.delete(code);return pressed;}
  down(...codes: string[]) {return codes.some(c => this.keys.has(c)||this.virtualKeys.has(c));}
  setTouchMode(enabled:boolean){this.touchMode=enabled;this.clear();}
  setVirtualMove(x:number,y:number){this.virtualX=Math.max(-1,Math.min(1,x));this.virtualY=Math.max(-1,Math.min(1,y));}
  setVirtualLook(dx:number,dy:number){this.yaw-=dx*this.sensitivity*1.5;this.pitch=Math.max(-.8,Math.min(.65,this.pitch-dy*this.sensitivity*1.5));}
  setVirtualHeld(code:string,held:boolean){if(held)this.virtualKeys.add(code);else this.virtualKeys.delete(code);}
  pressVirtual(code:string){this.pressed.add(code);}
  async capture() {if(this.touchMode)return true;try {await this.element.requestPointerLock();return document.pointerLockElement===this.element;} catch {return false;}}
}
