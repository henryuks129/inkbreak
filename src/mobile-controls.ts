export type TouchAction='jump'|'ability'|'slide'|'recenter'|'pause'|'switch';

export interface MobileControlSink {
  move(x:number,y:number):void;
  look(dx:number,dy:number):void;
  fire(held:boolean):void;
  swim(held:boolean):void;
  action(action:TouchAction):void;
}

/** A square dead zone keeps the character still when the thumb rests near center. */
export function stickVector(cx:number,cy:number,x:number,y:number,radius:number){
  if(!Number.isFinite(radius)||radius<=0)return{x:0,y:0};
  const dx=(x-cx)/radius,dy=(y-cy)/radius,length=Math.hypot(dx,dy);
  if(length<.13)return{x:0,y:0};
  const scale=Math.min(1,length)/length;
  return{x:dx*scale,y:-dy*scale};
}

export function supportsTouchControls(win:Pick<Window,'matchMedia'>,touchPoints=0){
  return win.matchMedia('(pointer: coarse)').matches||touchPoints>0;
}

export class MobileControls {
  readonly element:HTMLDivElement;
  private abort=new AbortController();
  private movingPointer:number|null=null;
  private lookingPointer:number|null=null;
  private lookX=0;private lookY=0;
  private held=new Map<'fire'|'swim',number>();
  private active=false;
  constructor(container:HTMLElement,private readonly sink:MobileControlSink){
    const root=document.createElement('div');root.className='touch-controls';root.setAttribute('aria-label','Touch game controls');root.hidden=true;
    root.innerHTML=`
      <div class="touch-aim" aria-label="Drag to aim"><span>DRAG TO AIM</span></div>
      <div class="touch-stick" aria-label="Move joystick"><span class="touch-stick-track"><i class="touch-stick-nub"></i></span><small>MOVE</small></div>
      <div class="touch-buttons">
        <button class="touch-button touch-swim" type="button" data-hold="swim" aria-label="Hold to swim and refill">SWIM</button>
        <button class="touch-button touch-slide" type="button" data-action="slide" aria-label="Slide">SLIDE</button>
        <button class="touch-button touch-jump" type="button" data-action="jump" aria-label="Jump">JUMP</button>
        <button class="touch-button touch-fire" type="button" data-hold="fire" aria-label="Hold to fire">FIRE</button>
        <button class="touch-button touch-ability" type="button" data-action="ability" aria-label="Use ability">SKILL</button>
        <button class="touch-button touch-switch" type="button" data-action="switch" aria-label="Switch squad fighter">SWAP</button>
      </div>
      <button class="touch-button touch-pause" type="button" data-action="pause" aria-label="Pause match">Ⅱ</button>`;
    container.append(root);this.element=root;
    const signal=this.abort.signal;
    const stick=root.querySelector<HTMLElement>('.touch-stick')!,nub=root.querySelector<HTMLElement>('.touch-stick-nub')!;
    const updateStick=(event:PointerEvent)=>{
      const rect=stick.getBoundingClientRect(),r=Math.min(rect.width,rect.height)*.43;
      const vector=stickVector(rect.left+rect.width/2,rect.top+rect.height/2,event.clientX,event.clientY,r);
      nub.style.transform=`translate(${vector.x*r*.48}px,${-vector.y*r*.48}px)`;
      this.sink.move(vector.x,vector.y);
    };
    stick.addEventListener('pointerdown',event=>{
      if(!this.active||this.movingPointer!==null)return;
      event.preventDefault();this.movingPointer=event.pointerId;stick.setPointerCapture(event.pointerId);updateStick(event);
    },{signal});
    stick.addEventListener('pointermove',event=>{if(event.pointerId===this.movingPointer){event.preventDefault();updateStick(event);}},{signal});
    const releaseStick=(event:PointerEvent)=>{if(event.pointerId!==this.movingPointer)return;this.movingPointer=null;nub.style.transform='';this.sink.move(0,0);};
    stick.addEventListener('pointerup',releaseStick,{signal});stick.addEventListener('pointercancel',releaseStick,{signal});
    const aim=root.querySelector<HTMLElement>('.touch-aim')!;
    aim.addEventListener('pointerdown',event=>{
      if(!this.active||this.lookingPointer!==null)return;
      event.preventDefault();this.lookingPointer=event.pointerId;this.lookX=event.clientX;this.lookY=event.clientY;aim.setPointerCapture(event.pointerId);
    },{signal});
    aim.addEventListener('pointermove',event=>{
      if(event.pointerId!==this.lookingPointer)return;
      event.preventDefault();const dx=Math.max(-80,Math.min(80,event.clientX-this.lookX)),dy=Math.max(-80,Math.min(80,event.clientY-this.lookY));
      this.lookX=event.clientX;this.lookY=event.clientY;this.sink.look(dx,dy);
    },{signal});
    const releaseAim=(event:PointerEvent)=>{if(event.pointerId===this.lookingPointer)this.lookingPointer=null;};
    aim.addEventListener('pointerup',releaseAim,{signal});aim.addEventListener('pointercancel',releaseAim,{signal});
    for(const button of root.querySelectorAll<HTMLButtonElement>('[data-hold]')){
      const kind=button.dataset.hold as 'fire'|'swim';const set=(held:boolean)=>{if(kind==='fire')this.sink.fire(held);else this.sink.swim(held);button.classList.toggle('is-held',held);};
      button.addEventListener('pointerdown',event=>{if(!this.active||this.held.has(kind))return;event.preventDefault();button.setPointerCapture(event.pointerId);this.held.set(kind,event.pointerId);set(true);},{signal});
      const release=(event:PointerEvent)=>{if(this.held.get(kind)!==event.pointerId)return;this.held.delete(kind);set(false);};
      button.addEventListener('pointerup',release,{signal});button.addEventListener('pointercancel',release,{signal});
    }
    for(const button of root.querySelectorAll<HTMLButtonElement>('[data-action]')){
      const action=button.dataset.action as TouchAction;
      button.addEventListener('pointerdown',event=>{if(!this.active)return;event.preventDefault();this.sink.action(action);button.classList.add('is-held');},{signal});
      for(const type of ['pointerup','pointercancel'] as const)button.addEventListener(type,()=>button.classList.remove('is-held'),{signal});
      button.addEventListener('click',event=>{if(this.active&&event.detail===0)this.sink.action(action);},{signal});
    }
    window.addEventListener('blur',()=>this.reset(),{signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();},{signal});
  }
  setVisible(visible:boolean){this.active=visible;this.element.hidden=!visible;if(!visible)this.reset();}
  setSquad(enabled:boolean){this.element.classList.toggle('has-squad',enabled);}
  reset(){this.movingPointer=null;this.lookingPointer=null;this.element.querySelector<HTMLElement>('.touch-stick-nub')!.style.transform='';this.sink.move(0,0);for(const kind of this.held.keys()){if(kind==='fire')this.sink.fire(false);else this.sink.swim(false);}this.held.clear();for(const button of this.element.querySelectorAll('.is-held'))button.classList.remove('is-held');}
  dispose(){this.setVisible(false);this.abort.abort();this.element.remove();}
}
