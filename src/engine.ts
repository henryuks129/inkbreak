import * as THREE from 'three';
import {ArenaView, createAvatar} from './world';
import {ARENAS, getArenaRamps, getRampVertices, type ArenaDefinition} from './arenas';
import {InkField, RoundRules, getInkSpeed, updateInk} from './simulation';
import {SquadMatch,HEROES,type Actor,type HeroId,type Mode,type Slot,type ShotSpec} from './combat';
import {Navigation} from './navigation';
import {downhillAt} from './slide';
import {ObjectiveView} from './combat-view';
import {Input} from './input';
import {Physics, initPhysics} from './physics';
import {Audio} from './audio';
import {validateAppearance,type HostPlayer} from './platform';
import {updateAvatar,setAvatarAppearance,setAvatarStyle,type AvatarStyle} from './character';

type Motion={velocity:THREE.Vector3;vy:number;yaw:number;target:THREE.Vector3;path:Array<{x:number,z:number}>;decision:number;planning:number;swim:boolean;slide:number;firing:boolean;damageDelay:number};
type Bot = {position:THREE.Vector3;mesh:THREE.Group;hp:number;respawn:number;cooldown:number;target:THREE.Vector3;turn:number};
type Projectile = {active:boolean;position:THREE.Vector3;velocity:THREE.Vector3;team:1|2;ownerId:string;damage:number;life:number;mesh:THREE.Mesh};
type Particle = {active:boolean;life:number;velocity:THREE.Vector3;mesh:THREE.Mesh};
export type Screen='menu'|'playing'|'paused'|'results';
export interface Snapshot {remaining:number;cyan:number;coral:number;ink:number;health:number;splats:number;swimming:boolean;sliding:boolean;respawn:number;fps:number;frameMs:number;drawCalls:number;state:Screen;arena:string;practice:boolean;mode:Mode;controlledClass:HeroId;squad:Array<{id:string;slot:number;hero:HeroId;hp:number;maxHp:number;ink:number;respawn:number;abilityCooldown:number;abilityRemaining:number;controlled:boolean}>;abilityCooldown:number;abilityRemaining:number;objectives:SquadMatch['objectives'];winner:SquadMatch['winner'];}
export interface Settings {quality:'performance'|'high'|'ultra';resolution:number;sensitivity:number;sound:boolean;}
const CYAN='#20ddcf', CORAL='#ff595e';
const Y=new THREE.Vector3(0,1,0);
export class Game {
  mode:Mode='turf';selectedClass=0;match=new SquadMatch('turf');actorMeshes=new Map<string,THREE.Group>();motions=new Map<string,Motion>();navigation!:Navigation;objectiveView?:ObjectiveView;private playerStyle?:AvatarStyle;private stepCadence=0;private objectiveColliders=new Map<string,ReturnType<Physics['world']['createCollider']>>();
  renderer:THREE.WebGLRenderer;
  scene=new THREE.Scene(); camera=new THREE.PerspectiveCamera(60,1,.1,240);
  input:Input; audio=new Audio(); field=new InkField(60,96); round=new RoundRules(180);
  view!:ArenaView; physics!:Physics; avatar=createAvatar(CYAN); bots:Bot[]=[];
  arena:ArenaDefinition=ARENAS[0]; state:Screen='menu'; practice=false;
  settings:Settings={quality:'high',resolution:1,sensitivity:1,sound:true};
  position=new THREE.Vector3(0,1,24);velocity=new THREE.Vector3(); hp=100; ink=100;respawn=0; swim=false;
  cooldown=0;damageCooldown=0; yVelocity=0; elapsed=0; last=0; accumulator=0;
  projectiles:Projectile[]=[];particles:Particle[]=[];
  sun:THREE.DirectionalLight; onDispose:()=>void=()=>{}; onState:(state:Screen)=>void=()=>{};onSnapshot:(s:Snapshot)=>void=()=>{};onNotice:(text:string)=>void=()=>{};
  frameTimes:number[]=[];fps=0;frameMs=0;renderCount=0;lastHud=0;lastPaint=-1; jumpHeld=false;
  private aim=new THREE.Vector3();private cameraTarget=new THREE.Vector3(); private cameraRay=new THREE.Raycaster();
  private collisionBoxes:THREE.Box3[]=[];
  private rampTriangles:THREE.Triangle[]=[];
  private groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  private followPivot=new THREE.Vector3();private bodyYaw=0;private swimBlend=0;
  private jumpBuffer=0;private coyote=0;private autoResolution=1;private resolutionTimer=0;
  private hostAppearance:HostPlayer['appearance']|null=null;
  private mounted=true; private raf=0; private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  static async create(container:HTMLElement) {await initPhysics();return new Game(container);}
  constructor(container:HTMLElement) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label','Inkbreak 3D arena');
    container.appendChild(this.renderer.domElement);this.input=new Input(this.renderer.domElement);
    this.input.onPause=()=>this.pause();
    this.scene.add(new THREE.HemisphereLight('#fff6db','#4d6d62',2.8));
    this.sun=new THREE.DirectionalLight('#fff2ce',3.5);this.sun.position.set(-20,38,15);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-38;this.sun.shadow.camera.right=38;this.sun.shadow.camera.top=38;this.sun.shadow.camera.bottom=-38;
    this.sun.shadow.camera.far=100;this.sun.shadow.normalBias=.04;this.sun.shadow.bias=-.00015;this.scene.add(this.sun,this.sun.target);

    const shotGeo=new THREE.SphereGeometry(.14,7,5),shotMats=[new THREE.MeshStandardMaterial({color:CYAN,emissive:CYAN,emissiveIntensity:.2,roughness:.2}),new THREE.MeshStandardMaterial({color:CORAL,emissive:CORAL,emissiveIntensity:.2,roughness:.2})];
    for(let i=0;i<180;i++) {const mesh=new THREE.Mesh(shotGeo,shotMats[i%2]);mesh.visible=false;this.scene.add(mesh);this.projectiles.push({active:false,position:new THREE.Vector3(),velocity:new THREE.Vector3(),team:1,ownerId:'',damage:26,life:0,mesh});}
    const particleGeo=new THREE.IcosahedronGeometry(.13,0);
    for(let i=0;i<160;i++){const mesh=new THREE.Mesh(particleGeo,shotMats[i%2]);mesh.visible=false;this.scene.add(mesh);this.particles.push({active:false,life:0,velocity:new THREE.Vector3(),mesh});}
    this.loadArena(0);this.applySettings(this.settings);window.addEventListener('resize',this.resize);
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.pause();this.onNotice('Graphics paused. Reload to restore the arena.');});
    this.resize();this.raf=requestAnimationFrame(this.loop);
  }
  resize=()=>{const w=window.innerWidth,h=window.innerHeight;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);};
  applySettings(settings:Settings) {
    this.settings={...settings};this.autoResolution=1;this.resolutionTimer=0;this.setRenderScale();
    this.renderer.shadowMap.enabled=settings.quality!=='performance';this.sun.castShadow=settings.quality!=='performance';
    this.input.sensitivity=.002*settings.sensitivity;this.audio.enabled=settings.sound;this.resize();
  }
  private setRenderScale(){this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.settings.quality==='ultra'?2:1.5)*this.settings.resolution*this.autoResolution);}
  setAppearance(a:HostPlayer['appearance']) {
    if(!validateAppearance(a))return;this.hostAppearance=a;
    for(const actor of this.match.actors)if(actor.team===1){const mesh=this.actorMeshes.get(actor.id);if(mesh)setAvatarAppearance(mesh,a);}
  }
  setPlayerStyle(style:AvatarStyle){this.playerStyle=style;for(const actor of this.match.actors)if(actor.team===1){const mesh=this.actorMeshes.get(actor.id);if(mesh)setAvatarStyle(mesh,style);}}
  loadArena(index:number) {
    if(this.view){this.scene.remove(this.view.group);this.view.dispose();this.physics.dispose();}
    this.arena=ARENAS[index];this.view=new ArenaView(this.arena);this.scene.add(this.view.group);
    this.scene.background=new THREE.Color(this.arena.sky);this.scene.fog=new THREE.Fog(this.arena.sky,65,155);
    this.physics=new Physics(this.arena);this.collisionBoxes=this.arena.obstacles.map(b=>new THREE.Box3(new THREE.Vector3(b.x-b.w/2,b.y??0,b.z-b.d/2),new THREE.Vector3(b.x+b.w/2,(b.y??0)+b.h,b.z+b.d/2)));this.rampTriangles=getArenaRamps(this.arena).flatMap(ramp=>{const values=getRampVertices(ramp),vertices=Array.from({length:6},(_,i)=>new THREE.Vector3(values[i*3]+ramp.x,values[i*3+1],values[i*3+2]+ramp.z));return [[4,5,3],[4,3,2],[0,1,5],[0,5,4],[0,2,3],[0,3,1],[0,4,2],[1,3,5]].map(([a,b,c])=>new THREE.Triangle(vertices[a],vertices[b],vertices[c]));});this.field.reset();this.lastPaint=-1;
    this.navigation=new Navigation((x,z)=>this.blocked(x,z,.8));this.buildMatch();this.clearEffects();this.seedInk();this.paint();
  }
  setMode(mode:Mode){if(this.state==='playing')return;this.mode=mode;this.loadArena(ARENAS.indexOf(this.arena));}
  setClass(index:number){if(!Number.isInteger(index)||index<0||index>4)return;if(this.state==='playing'){if(this.mode==='squad'&&this.match.switchSlot((index+1) as Slot)){this.syncControlled(true);this.audio.tone('switch');}return;}this.selectedClass=index;this.buildMatch();}
  private validSpawn(x:number,z:number,radius=.9){if(!this.blocked(x,z,radius))return {x,y:1.05,z};for(let r=1;r<12;r++)for(let i=0;i<16;i++){const angle=i*Math.PI/8,nx=x+Math.cos(angle)*r,nz=z+Math.sin(angle)*r;if(!this.blocked(nx,nz,radius))return{x:nx,y:1.05,z:nz};}return{x:0,y:1.05,z:24};}
  private buildMatch(){
    for(const mesh of this.actorMeshes.values()){this.scene.remove(mesh);mesh.traverse(o=>{if(o instanceof THREE.SkinnedMesh)o.skeleton.dispose();if(o instanceof THREE.Mesh){o.geometry.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material])material.dispose();}});}this.actorMeshes.clear();this.motions.clear();
    // Recreate one arena physics world so old actor capsules cannot linger after mode changes.
    this.physics.dispose();this.physics=new Physics(this.arena);
    const cyan=Array.from({length:5},(_,i)=>this.validSpawn(this.arena.spawn[0]+(i-2)*2.5,this.arena.spawn[1]));
    const coral=Array.from({length:5},(_,i)=>this.validSpawn((i-2)*2.5,-24));
    this.match=new SquadMatch(this.mode,{cyan,coral});
    if(this.mode==='turf'){const actor=this.match.controlled;actor.hero=(['runner','anchor','breacher','medic','ranger'] as HeroId[])[this.selectedClass];actor.hp=HEROES[actor.hero].maxHp;}
    for(const objective of this.match.objectives){const p=this.validSpawn(objective.position.x,objective.position.z,objective.kind==='core'?2.8:2.4);objective.position={...p,y:1.2};}
    this.objectiveColliders.clear();for(const objective of this.match.objectives){const radius=objective.kind==='core'?2.2:1.8;this.objectiveColliders.set(objective.id,this.physics.addObstacle(objective.position.x,objective.position.z,radius,2.4));}
    this.navigation=new Navigation((x,z)=>this.blocked(x,z,.8)||this.match.objectives.some(o=>Math.hypot(x-o.position.x,z-o.position.z)<(o.kind==='core'?3:2.6)));
    this.objectiveView?.dispose();if(this.objectiveView)this.scene.remove(this.objectiveView.group);this.objectiveView=new ObjectiveView(this.match.objectives);this.scene.add(this.objectiveView.group);
    for(const actor of this.match.actors){const mesh=createAvatar(actor.team===1?CYAN:CORAL);if(actor.team===1){if(this.hostAppearance)setAvatarAppearance(mesh,this.hostAppearance);if(this.playerStyle)setAvatarStyle(mesh,this.playerStyle);}this.actorMeshes.set(actor.id,mesh);this.scene.add(mesh);this.physics.addActor(actor.id,actor.position.x,actor.position.z);this.motions.set(actor.id,{velocity:new THREE.Vector3(),vy:0,yaw:actor.team===1?0:Math.PI,target:new THREE.Vector3(actor.position.x,1,0),path:[],decision:0,planning:0,swim:false,slide:0,firing:false,damageDelay:0});}
    this.syncControlled(true);this.bots=this.match.actors.filter(a=>a.team===2).map(a=>({position:new THREE.Vector3(a.position.x,a.position.y,a.position.z),mesh:this.actorMeshes.get(a.id)!,hp:a.hp,respawn:a.respawn,cooldown:0,target:new THREE.Vector3(),turn:0}));
  }
  seedInk(){for(const actor of this.match.actors){if(this.practice&&actor.id!==this.match.controlledId)continue;this.field.paint(actor.position.x,actor.position.z,this.mode==='squad'?1.5:actor.team===1?3:2.12,actor.team);}}
  resetPlayer(){this.buildMatch();}
  private syncControlled(reset=false){const actor=this.match.controlled;if(!actor)return;this.avatar=this.actorMeshes.get(actor.id)!;this.position.set(actor.position.x,actor.position.y,actor.position.z);this.hp=actor.hp;this.ink=actor.ink;this.respawn=actor.respawn;const motion=this.motions.get(actor.id)!,body=this.physics.actors.get(actor.id)!;this.physics.body=body.body;this.physics.collider=body.collider;this.physics.controller=body.controller;this.physics.grounded=body.grounded;this.velocity=motion.velocity;this.swim=motion.swim;this.bodyYaw=motion.yaw;this.cooldown=actor.cooldown;if(reset){this.input.yaw=motion.yaw;this.input.pitch=-.15;this.followPivot.copy(this.position).add(new THREE.Vector3(0,.65,0));this.jumpBuffer=0;this.coyote=0;}}
  useAbility(){if(this.match.useAbility(this.match.controlledId)){this.audio.tone('ability');this.onNotice(HEROES[this.match.controlled.hero].name+' ability activated');}}
  clearEffects(){for(const p of this.projectiles){p.active=false;p.mesh.visible=false;}for(const p of this.particles){p.active=false;p.mesh.visible=false;}}
  async start(practice=false){
    const captured=await this.input.capture();if(!captured){this.onNotice('Mouse capture was blocked. Click Start again to play.');return false;}
    this.practice=practice;this.round.reset();this.round.active=true;this.field.reset();this.resetPlayer();this.clearEffects();
    this.match.paused=false;
    this.seedInk();this.audio.start();this.state='playing';this.input.clear();this.accumulator=0;this.onState(this.state);return true;
  }
  pause(){if(this.state!=='playing')return;this.state='paused';this.round.active=false;this.match.paused=true;this.input.clear();if(document.pointerLockElement)document.exitPointerLock();this.onState(this.state);}
  async resume(){if(this.state!=='paused')return;const captured=await this.input.capture();if(!captured){this.onNotice('Click Resume again to capture your mouse.');return;}this.state='playing';this.round.active=true;this.match.paused=false;this.accumulator=0;this.onState(this.state);}
  menu(){this.state='menu';this.round.active=false;this.input.clear();if(document.pointerLockElement)document.exitPointerLock();this.bots.forEach(b=>b.mesh.visible=true);this.onState(this.state);}
  selectArena(index:number){if(this.state==='playing')this.pause();this.loadArena(index);this.state='menu';this.onState('menu');}
  finish(){this.audio.tone(this.match.winner===1?'win':'lose');this.state='results';this.round.active=false;this.input.clear();if(document.pointerLockElement)document.exitPointerLock();this.onState(this.state);}
  direction(){return new THREE.Vector3(-Math.sin(this.input.yaw)*Math.cos(this.input.pitch),Math.sin(this.input.pitch),-Math.cos(this.input.yaw)*Math.cos(this.input.pitch));}
  simulate(dt:number){
    if(this.state!=='playing')return;
    const previousId=this.match.controlledId,previousRespawns=new Map(this.match.actors.map(a=>[a.id,a.respawn]));
    const coverage=this.field.coverage();if(!this.practice)this.match.update(dt,coverage.cyan,coverage.coral);else {for(const actor of this.match.actors){actor.cooldown=Math.max(0,actor.cooldown-dt);actor.abilityCooldown=Math.max(0,actor.abilityCooldown-dt);actor.abilityRemaining=Math.max(0,actor.abilityRemaining-dt);}}
    if(this.match.finished){this.finish();return;}
    if(this.mode==='squad'&&!this.practice)for(let i=1;i<=5;i++)if(this.input.consume('Digit'+i))this.match.switchSlot(i as Slot);
    if(previousId!==this.match.controlledId){this.syncControlled(true);this.audio.tone('switch');}
    if(this.input.consume('KeyF'))this.useAbility();
    const controlled=this.match.controlled;
    for(const actor of this.match.actors){
      const motion=this.motions.get(actor.id)!,mesh=this.actorMeshes.get(actor.id)!,body=this.physics.actors.get(actor.id)!;
      const active=actor.hp>0&&actor.respawn===0&&(!this.practice||actor.id===controlled.id);mesh.visible=active;
      if(!active){body.collider.setEnabled(false);continue;}body.collider.setEnabled(true);
      if((previousRespawns.get(actor.id)??0)>0&&actor.respawn===0){this.physics.teleportActor(actor.id,actor.position.x,actor.position.z);motion.velocity.set(0,0,0);motion.vy=0;motion.slide=0;motion.path=[];motion.planning=0;}
      const surface=body.grounded&&actor.position.y<1.2?this.field.at(actor.position.x,actor.position.z):0,friendly=surface===actor.team;
      let desired=new THREE.Vector3(),shoot=false;
      if(actor.id===controlled.id){
        if(this.input.consume('KeyC')){this.input.yaw=motion.yaw;this.input.pitch=-.12;}
        motion.swim=this.input.down('ShiftLeft','ShiftRight')&&friendly&&actor.position.y<1.2;
        const forward=Number(this.input.down('KeyW','ArrowUp'))-Number(this.input.down('KeyS','ArrowDown')),strafe=Number(this.input.down('KeyD','ArrowRight'))-Number(this.input.down('KeyA','ArrowLeft'));desired.set(strafe,0,-forward);if(desired.lengthSq())desired.normalize();desired.applyAxisAngle(Y,this.input.yaw);
        const slope=downhillAt(this.arena,actor.position.x,actor.position.y,actor.position.z);
        if(this.input.consume('KeyX')&&body.grounded&&!motion.swim&&(motion.velocity.length()>2||slope)){motion.slide=1.05;if(motion.velocity.length()<4&&slope)motion.velocity.set(slope.x*4,0,slope.z*4);else motion.velocity.multiplyScalar(1.3);}
        if(!body.grounded||motion.swim)motion.slide=0;
        this.coyote=body.grounded?.09:Math.max(0,this.coyote-dt);this.jumpBuffer=this.input.consume('Space')?.11:Math.max(0,this.jumpBuffer-dt);if(this.jumpBuffer>0&&this.coyote>0){motion.vy=9;this.jumpBuffer=0;this.coyote=0;this.audio.tone('jump');}
        shoot=(this.input.firing||this.input.down('KeyJ'))&&!motion.swim;motion.target.copy(this.position).addScaledVector(this.direction(),30);motion.yaw=this.input.yaw;
      }else {
        motion.decision-=dt;motion.planning-=dt;
        if(motion.decision<=0){this.decide(actor,motion);motion.decision=.1;}
        const waypoint=motion.path[0];if(waypoint){desired.set(waypoint.x-actor.position.x,0,waypoint.z-actor.position.z);if(desired.length()<.65)motion.path.shift();else desired.normalize();}
        motion.swim=friendly&&(actor.ink<45||desired.lengthSq()>0&&!motion.firing);shoot=motion.firing&&actor.ink>8;
        const facing=motion.firing?motion.target.clone().sub(new THREE.Vector3(actor.position.x,actor.position.y,actor.position.z)):desired;if(facing.lengthSq()>.01)motion.yaw=Math.atan2(-facing.x,-facing.z);
      }
      const inkSpeed=surface!==0&&surface!==actor.team?.55:motion.swim?1.85:1;desired.multiplyScalar(this.match.speed(actor)*inkSpeed);
      if(actor.id===controlled.id&&motion.slide>0){const slope=downhillAt(this.arena,actor.position.x,actor.position.y,actor.position.z);motion.velocity.addScaledVector(desired,dt*.45);if(slope)motion.velocity.add(new THREE.Vector3(slope.x,0,slope.z).multiplyScalar(20*slope.steepness*dt));motion.velocity.multiplyScalar(Math.exp(-dt*(slope?.55:1.6)));motion.velocity.clampLength(0,13);motion.slide=Math.max(0,motion.slide-dt);}
      else motion.velocity.lerp(desired,1-Math.exp(-dt*(body.grounded?30:7)));
      motion.vy-=25*dt;this.physics.moveActor(actor.id,motion.velocity.x*dt,motion.vy*dt,motion.velocity.z*dt);
      motion.firing=shoot;if(!shoot)actor.ink=updateInk(actor.ink,dt,motion.swim,friendly,false);
      motion.damageDelay=Math.max(0,motion.damageDelay-dt);if(surface!==0&&!friendly){if(actor.hp>30)actor.hp=Math.max(30,actor.hp-dt*6);}else if(motion.damageDelay===0)actor.hp=Math.min(HEROES[actor.hero].maxHp,actor.hp+dt*5);
    }
    // All capsules submit movement against one snapshot; advance the shared Rapier world once.
    this.physics.step(dt);this.stepCadence-=dt;const localMotion=this.motions.get(controlled.id)!;if(this.stepCadence<=0&&this.physics.actors.get(controlled.id)?.grounded&&localMotion.velocity.length()>1){this.audio.step(localMotion.swim);this.stepCadence=localMotion.swim?.22:.32;}
    for(const actor of this.match.actors){const motion=this.motions.get(actor.id)!,body=this.physics.actors.get(actor.id)!,mesh=this.actorMeshes.get(actor.id)!;if(actor.respawn>0||this.practice&&actor.id!==controlled.id)continue;const p=body.body.translation();actor.position={x:p.x,y:p.y,z:p.z};if(body.grounded)motion.vy=0;mesh.position.set(p.x,p.y-.9,p.z);mesh.rotation.y=motion.yaw;updateAvatar(mesh,{time:this.elapsed+actor.slot*.2,dt,speed:motion.velocity.length(),grounded:body.grounded,swimming:motion.swim,sliding:motion.slide>0,firing:motion.firing,pitch:actor.id===controlled.id?this.input.pitch:0});if(motion.firing){if(actor.id===controlled.id)this.shootPlayer();else this.shootActor(actor,motion.target);}}
    this.updateProjectiles(dt);this.updateParticles(dt);this.objectiveView?.update(this.match.objectives);for(const objective of this.match.objectives)this.objectiveColliders.get(objective.id)?.setEnabled(objective.hp>0);this.syncControlled();this.round.remaining=this.match.remaining;this.round.splats=this.match.splats[1];
    if(this.match.controlledId!==controlled.id)this.syncControlled(true);if(this.match.finished)this.finish();
  }
  private decide(actor:Actor,motion:Motion){
    const origin=new THREE.Vector3(actor.position.x,actor.position.y+.3,actor.position.z),enemies=this.match.actors.filter(a=>a.team!==actor.team&&a.hp>0&&a.respawn===0).sort((a,b)=>origin.distanceToSquared(new THREE.Vector3(a.position.x,a.position.y,a.position.z))-origin.distanceToSquared(new THREE.Vector3(b.position.x,b.position.y,b.position.z)));
    const enemy=enemies.find(a=>origin.distanceTo(new THREE.Vector3(a.position.x,a.position.y,a.position.z))<23&&this.lineOfSight(origin,new THREE.Vector3(a.position.x,a.position.y+.2,a.position.z)));
    const objectives=this.match.objectives.filter(o=>o.team!==actor.team&&o.hp>0&&!o.locked).sort((a,b)=>origin.distanceToSquared(new THREE.Vector3(a.position.x,a.position.y,a.position.z))-origin.distanceToSquared(new THREE.Vector3(b.position.x,b.position.y,b.position.z)));
    const objective=objectives[actor.slot%Math.min(2,objectives.length)]??objectives[0];
    motion.firing=false;
    if(enemy){motion.target.set(enemy.position.x,enemy.position.y+.1,enemy.position.z);motion.firing=actor.ink>8;}
    else if(objective){motion.target.set(objective.position.x,objective.position.y,objective.position.z);motion.firing=origin.distanceTo(motion.target)<23&&this.lineOfSight(origin,motion.target)&&actor.ink>8;}
    else {if(motion.planning<=0&&(!motion.path.length||origin.distanceTo(motion.target)<3||this.field.at(motion.target.x,motion.target.z)===actor.team)){for(let attempt=0;attempt<8;attempt++){const x=(Math.random()-.5)*45,z=(Math.random()-.5)*45;if(!this.blocked(x,z)&&this.field.at(x,z)!==actor.team){motion.target.set(x,.05,z);break;}}}motion.firing=actor.ink>15&&origin.distanceTo(motion.target)<23&&this.lineOfSight(origin,motion.target);}
    let destination=motion.target.clone();
    if(actor.ink<12){destination.set(actor.spawn.x,1,actor.spawn.z);motion.firing=false;}
    if(motion.planning<=0){if(motion.firing&&origin.distanceTo(motion.target)<13)motion.path=[];else motion.path=this.navigation.path(actor.position.x,actor.position.z,destination.x,destination.z);motion.planning=.5;}
    if(actor.abilityCooldown===0&&(enemy||actor.hp<HEROES[actor.hero].maxHp*.6))this.match.useAbility(actor.id);
  }
  private lineOfSight(origin:THREE.Vector3,target:THREE.Vector3){const delta=target.clone().sub(origin),length=delta.length(),ray=new THREE.Ray(origin,delta.normalize()),point=new THREE.Vector3();for(const box of this.collisionBoxes)if(ray.intersectBox(box,point)&&point.distanceTo(origin)<length-.5)return false;for(const triangle of this.rampTriangles)if(ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,point)&&point.distanceTo(origin)<length-.5)return false;return true;}
  shootPlayer(){
    const actor=this.match.controlled,dir=this.direction(),origin=new THREE.Vector3(actor.position.x,actor.position.y,actor.position.z).add(new THREE.Vector3(.42,.35,-.6).applyAxisAngle(Y,this.input.yaw));
    this.cameraRay.setFromCamera(new THREE.Vector2(0,0),this.camera);this.aim.copy(this.camera.position).addScaledVector(dir,60);let nearest=60;const point=new THREE.Vector3(),ray=this.cameraRay.ray;const accept=()=>{const distance=point.distanceTo(ray.origin);if(distance>.6&&distance<nearest){nearest=distance;this.aim.copy(point);}};
    for(const box of this.collisionBoxes)if(ray.intersectBox(box,point))accept();for(const triangle of this.rampTriangles)if(ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,point))accept();if(ray.intersectPlane(this.groundPlane,point)&&Math.abs(point.x)<30&&Math.abs(point.z)<30)accept();
    for(const other of this.match.actors)if(other.team!==actor.team&&other.hp>0&&ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(other.position.x,other.position.y,other.position.z),.9),point))accept();for(const objective of this.match.objectives)if(objective.hp>0&&ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(objective.position.x,objective.position.y,objective.position.z),objective.kind==='core'?2.2:1.8),point))accept();
    this.shootActor(actor,this.aim,origin);
  }
  private shootActor(actor:Actor,target:THREE.Vector3,origin=new THREE.Vector3(actor.position.x,actor.position.y+.35,actor.position.z)){
    if(!this.lineOfSight(new THREE.Vector3(actor.position.x,actor.position.y+.35,actor.position.z),origin))return;
    const spec=this.match.tryFire(actor.id);if(!spec)return;const direction=target.clone().sub(origin);const flight=Math.hypot(direction.x,direction.z)/spec.speed;direction.y+=Math.min(4,6*flight*flight);direction.normalize();for(let i=0;i<spec.count;i++){const velocity=direction.clone().applyAxisAngle(Y,(i-(spec.count-1)/2)*spec.spread).multiplyScalar(spec.speed);this.fire(origin,velocity,spec.team,spec);}if(actor.id===this.match.controlledId)this.audio.shot(actor.hero);
  }
  fire(origin:THREE.Vector3,velocity:THREE.Vector3,team:1|2,spec?:ShotSpec){const p=this.projectiles.find(p=>!p.active&&((p.mesh.material as THREE.MeshStandardMaterial).color.getHexString()===(team===1?'20ddcf':'ff595e')));if(!p)return;p.active=true;p.life=2.2;p.team=team;p.ownerId=spec?.ownerId??'';p.damage=spec?.damage??26;p.position.copy(origin);p.velocity.copy(velocity);p.mesh.position.copy(origin);p.mesh.visible=true;}
  blocked(x:number,z:number,r=.65){if(Math.abs(x)>29-r||Math.abs(z)>29-r)return true;if(getArenaRamps(this.arena).some(b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r))return true;return this.arena.obstacles.some(b=>x>b.x-b.w/2-r&&x<b.x+b.w/2+r&&z>b.z-b.d/2-r&&z<b.z+b.d/2+r);}
  updateBots(_dt:number){} // Compatibility: squad AI is advanced within the shared fixed tick.
  updateProjectiles(dt:number){
    for(const p of this.projectiles){if(!p.active)continue;const prev=p.position.clone();p.velocity.y-=12*dt;p.position.addScaledVector(p.velocity,dt);p.life-=dt;const delta=p.position.clone().sub(prev),length=delta.length();let closest=length+.001,kind:'cover'|'actor'|'objective'|null=null,id='';const point=new THREE.Vector3(),hit=new THREE.Vector3();
      if(length>0){const ray=new THREE.Ray(prev,delta.normalize()),accept=(k:typeof kind,key:string)=>{const distance=point.distanceTo(prev);if(distance<=length&&distance<closest){closest=distance;kind=k;id=key;hit.copy(point);}};
        for(const box of this.collisionBoxes)if(ray.intersectBox(box,point))accept('cover','');for(const triangle of this.rampTriangles)if(ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,point))accept('cover','');
        for(const actor of this.match.actors){if(actor.team===p.team||actor.hp<=0||actor.respawn>0||this.practice&&actor.id!==this.match.controlledId)continue;if(ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(actor.position.x,actor.position.y,actor.position.z),.8),point))accept('actor',actor.id);}
        for(const objective of this.match.objectives){if(objective.hp<=0)continue;if(ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(objective.position.x,objective.position.y,objective.position.z),objective.kind==='core'?2.2:1.8),point))accept('objective',objective.id);}
      }
      let impact=kind!==null;if(impact){p.position.copy(hit);if(kind==='actor'){const actor=this.match.actor(id)!;this.match.damageActor(id,p.damage,p.team);if(id===this.match.controlledId)this.audio.tone('hurt');this.motions.get(id)!.damageDelay=2;if(p.team===1)this.audio.tone('hit');if(actor.hp<=0){this.splash(new THREE.Vector3(actor.position.x,actor.position.y,actor.position.z),actor.team,15);this.onNotice(HEROES[actor.hero].name+' splatted');this.audio.tone('splat');}}else if(kind==='objective'){const objective=this.match.objectives.find(o=>o.id===id)!;const before=objective.hp;this.match.damageObjective(id,p.damage,p.team);if(before>0&&objective.hp===0)this.audio.tone('objective');}}
      if(p.position.y<=.08){p.position.y=.05;impact=true;this.field.paint(p.position.x,p.position.z,1.25+Math.random()*.35,p.team);}
      if(impact){this.splash(p.position,p.team,5);p.active=false;p.mesh.visible=false;}else if(p.life<=0||Math.abs(p.position.x)>31||Math.abs(p.position.z)>31){p.active=false;p.mesh.visible=false;}else {p.mesh.position.copy(p.position);p.mesh.scale.set(.8,.8,1.6);p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),p.velocity.clone().normalize());}
    }
  }
  segmentDistance(a:THREE.Vector3,b:THREE.Vector3,p:THREE.Vector3){return new THREE.Line3(a,b).closestPointToPoint(p,true,new THREE.Vector3()).distanceTo(p);}
  splash(position:THREE.Vector3,team:1|2,count:number){if(this.settings.quality==='performance')count=Math.ceil(count/2);for(let i=0;i<count;i++){const p=this.particles.find(p=>!p.active&&((p.mesh.material as THREE.MeshStandardMaterial).color.getHexString()===(team===1?'20ddcf':'ff595e')));if(!p)break;p.active=true;p.life=.3+Math.random()*.3;p.mesh.position.copy(position);p.mesh.visible=true;p.mesh.scale.setScalar(.5+Math.random());p.velocity.set((Math.random()-.5)*6,Math.random()*5,(Math.random()-.5)*6);}}
  updateParticles(dt:number){for(const p of this.particles){if(!p.active)continue;p.life-=dt;p.velocity.y-=20*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.scale.multiplyScalar(1-dt*2);if(p.life<=0){p.active=false;p.mesh.visible=false;}}}
  paint(){if(this.field.revision===this.lastPaint)return;this.view.updateInk(this.field.cells,this.field.resolution);this.lastPaint=this.field.revision;}
  updateCamera(dt:number){
    if(this.state==='menu'){
      const t=this.elapsed*.035;const look=new THREE.Vector3(0,1.5,0),target=new THREE.Vector3(Math.sin(t)*29,23,Math.cos(t)*29);
      this.camera.position.lerp(target,1-Math.exp(-dt*2));this.camera.lookAt(look);this.avatar.visible=false;return;
    }
    const sliding=(this.motions.get(this.match.controlledId)?.slide??0)>0;const pivot=this.position.clone().add(new THREE.Vector3(0,.65-this.swimBlend*.35-(sliding?.22:0),0));
    this.followPivot.lerp(pivot,1-Math.exp(-dt*28));
    const dir=this.direction(),right=new THREE.Vector3(Math.cos(this.input.yaw),0,-Math.sin(this.input.yaw));
    const distance=4.6-this.swimBlend*.5;
    const target=this.followPivot.clone().addScaledVector(dir,-distance).addScaledVector(right,.85).add(new THREE.Vector3(0,.55,0));
    const rayDir=target.clone().sub(this.followPivot),max=rayDir.length();this.cameraRay.set(this.followPivot,rayDir.normalize());
    let nearest=max;const point=new THREE.Vector3();
    for(const box of this.collisionBoxes)if(this.cameraRay.ray.intersectBox(box,point)){const distance=point.distanceTo(this.followPivot);if(distance>.05)nearest=Math.min(nearest,distance-.25);}
    for(const triangle of this.rampTriangles)if(this.cameraRay.ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,point)){const distance=point.distanceTo(this.followPivot);if(distance>.05)nearest=Math.min(nearest,distance-.25);}
    if(nearest<max)target.copy(this.followPivot).addScaledVector(rayDir,Math.max(.65,nearest));
    // Aim responds immediately; only the follow pivot absorbs ground/jump vibration.
    this.camera.position.copy(target);this.cameraTarget.copy(target).addScaledVector(dir,25);this.camera.lookAt(this.cameraTarget);
    const fov=60+(this.reduced?0:Math.min(4,this.velocity.length()/14*4));
    this.camera.fov=THREE.MathUtils.damp(this.camera.fov,fov,6,dt);this.camera.updateProjectionMatrix();
  }
  snapshot():Snapshot{const c=this.field.coverage(),actor=this.match.controlled;return {remaining:this.match.remaining,cyan:c.cyan/c.total*100,coral:c.coral/c.total*100,ink:this.ink,health:this.hp,splats:this.match.splats[1],swimming:this.swim,sliding:(this.motions.get(actor.id)?.slide??0)>0,respawn:this.respawn,fps:this.fps,frameMs:this.frameMs,drawCalls:this.renderer.info.render.calls,state:this.state,arena:this.arena.name,practice:this.practice,mode:this.mode,controlledClass:actor.hero,squad:this.match.actors.filter(a=>a.team===1).map(a=>({id:a.id,slot:a.slot,hero:a.hero,hp:a.hp,maxHp:HEROES[a.hero].maxHp,ink:a.ink,respawn:a.respawn,abilityCooldown:a.abilityCooldown,abilityRemaining:a.abilityRemaining,controlled:a.id===actor.id})),abilityCooldown:actor.abilityCooldown,abilityRemaining:actor.abilityRemaining,objectives:this.match.objectives,winner:this.match.winner};}
  loop=(now:number)=>{
    if(!this.mounted)return;this.raf=requestAnimationFrame(this.loop);const raw=this.last?(now-this.last)/1000:1/60;this.last=now;const dt=Math.min(.05,raw);this.elapsed+=dt;
    if(raw>0&&raw<.25){this.frameTimes.push(raw*1000);if(this.frameTimes.length>240)this.frameTimes.shift();}
    this.accumulator+=dt;const step=1/120;while(this.accumulator>=step){this.simulate(step);this.accumulator-=step;}
    this.resolutionTimer+=raw;
    if(this.resolutionTimer>2&&this.frameTimes.length>30){const recent=this.frameTimes.slice(-60);const mean=recent.reduce((a,b)=>a+b,0)/recent.length;const next=mean>22?Math.max(.6,this.autoResolution-.1):mean<11?Math.min(1,this.autoResolution+.05):this.autoResolution;if(next!==this.autoResolution){this.autoResolution=next;this.setRenderScale();}this.resolutionTimer=0;}
    this.updateCamera(dt);if(this.renderCount%4===0)this.paint();this.renderer.render(this.scene,this.camera);this.renderCount++;
    if(now-this.lastHud>150){const mean=this.frameTimes.reduce((a,b)=>a+b,0)/Math.max(1,this.frameTimes.length);this.fps=Math.round(1000/mean)||0;this.frameMs=mean;this.onSnapshot(this.snapshot());this.lastHud=now;}
  };
  diagnostics(){const gl=this.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');const gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';const sorted=[...this.frameTimes].sort((a,b)=>a-b);return {...this.snapshot(),gpu,p95Ms:sorted[Math.floor(sorted.length*.95)]??0,viewport:[innerWidth,innerHeight],pixelRatio:this.renderer.getPixelRatio(),quality:this.settings.quality,resolution:this.settings.resolution,autoResolution:this.autoResolution,userAgent:navigator.userAgent,geometry:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures};}
  dispose(){this.mounted=false;cancelAnimationFrame(this.raf);window.removeEventListener('resize',this.resize);this.input.dispose();this.audio.dispose();this.onDispose();this.physics.dispose();this.view.dispose();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();this.scene.traverse(o=>{if(o instanceof THREE.SkinnedMesh)o.skeleton.dispose();if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.sun.shadow.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
