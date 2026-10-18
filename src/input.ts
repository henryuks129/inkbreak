export class Input {
  private abort = new AbortController();
  keys = new Set<string>(); firing = false; yaw = 0; pitch = -.15; sensitivity = .002;
  onPause: () => void = () => {};
  private pressed = new Set<string>();
  constructor(public element: HTMLCanvasElement) {
    window.addEventListener('keydown', e => {
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code) && document.pointerLockElement) e.preventDefault();
      if (document.pointerLockElement === element) {if(!this.keys.has(e.code))this.pressed.add(e.code);this.keys.add(e.code);}
    }, {signal:this.abort.signal});
    window.addEventListener('keyup', e => this.keys.delete(e.code), {signal:this.abort.signal});
    window.addEventListener('mousemove', e => { if (document.pointerLockElement === element) { this.yaw -= e.movementX * this.sensitivity; this.pitch = Math.max(-.8, Math.min(.65, this.pitch - e.movementY * this.sensitivity)); } }, {signal:this.abort.signal});
    window.addEventListener('mousedown', e => {if (e.button === 0 && document.pointerLockElement === element) this.firing = true;}, {signal:this.abort.signal});
    window.addEventListener('mouseup', () => this.firing = false, {signal:this.abort.signal});
    document.addEventListener('pointerlockchange', () => {if (document.pointerLockElement !== element) {this.clear(); this.onPause();}}, {signal:this.abort.signal});
    window.addEventListener('blur', () => {this.clear(); this.onPause();}, {signal:this.abort.signal});
    document.addEventListener('visibilitychange', () => {if(document.hidden) {this.clear(); this.onPause();}}, {signal:this.abort.signal});
  }
  dispose() {this.abort.abort();this.clear();}
  clear() {this.keys.clear();this.pressed.clear();this.firing=false;}
  consume(code:string) {const pressed=this.pressed.has(code);this.pressed.delete(code);return pressed;}
  down(...codes: string[]) {return codes.some(c => this.keys.has(c));}
  async capture() {try {await this.element.requestPointerLock();return document.pointerLockElement===this.element;} catch {return false;}}
}
