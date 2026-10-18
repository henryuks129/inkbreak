export type CombatTeam = 1 | 2;
export type HeroId = 'runner' | 'anchor' | 'breacher' | 'medic' | 'ranger';
export type Mode = 'turf' | 'squad';
export type Slot = 1 | 2 | 3 | 4 | 5;
export interface Position { x:number; y:number; z:number }
export interface HeroDefinition {
  name:string; maxHp:number; speed:number; damage:number; fireInterval:number;
  projectileSpeed:number; inkCost:number; abilityCooldown:number; abilityDuration:number;
}
export const HEROES:Readonly<Record<HeroId,Readonly<HeroDefinition>>> = {
  runner:{name:'Zip',maxHp:100,speed:8,damage:23,fireInterval:.12,projectileSpeed:38,inkCost:1.8,abilityCooldown:8,abilityDuration:.7},
  anchor:{name:'Bastion',maxHp:160,speed:5.8,damage:26,fireInterval:.2,projectileSpeed:32,inkCost:2.2,abilityCooldown:12,abilityDuration:3},
  breacher:{name:'Rivet',maxHp:115,speed:7,damage:20,fireInterval:.19,projectileSpeed:34,inkCost:2.1,abilityCooldown:10,abilityDuration:2},
  medic:{name:'Mender',maxHp:105,speed:7.4,damage:18,fireInterval:.13,projectileSpeed:36,inkCost:1.7,abilityCooldown:12,abilityDuration:0},
  ranger:{name:'Vesper',maxHp:85,speed:7,damage:44,fireInterval:.55,projectileSpeed:62,inkCost:5,abilityCooldown:10,abilityDuration:3},
};
export interface Actor {
  id:string; team:CombatTeam; slot:Slot; hero:HeroId; position:Position; spawn:Position;
  hp:number; ink:number; respawn:number; cooldown:number; abilityCooldown:number; abilityRemaining:number;
}
export interface Objective {
  id:string; team:CombatTeam; kind:'bunker'|'core'; position:Position;
  hp:number; maxHp:number; locked:boolean;
}
export interface ShotSpec { ownerId:string; team:CombatTeam; damage:number; speed:number; count:number; spread:number }
export interface SquadSpawns { cyan:Position[]; coral:Position[] }
const ROSTER:readonly HeroId[]=['runner','anchor','breacher','medic','ranger'];
const copy=(p:Position):Position=>({x:p.x,y:p.y,z:p.z});
const validAmount=(n:number)=>Number.isFinite(n)&&n>0;
const validTeam=(team:CombatTeam)=>team===1||team===2;

/** Pure match rules. Runtime owns movement, projectiles, collision and surface-based refill. */
export class SquadMatch {
  actors:Actor[]=[];
  objectives:Objective[]=[];
  controlledId='';
  remaining:number;
  paused=false;
  finished=false;
  /** null while playing; 0 is an exact draw. */
  winner:0|CombatTeam|null=null;
  splats:Record<CombatTeam,number>={1:0,2:0};
  private readonly spawns:SquadSpawns;
  constructor(readonly mode:Mode='squad',spawns?:SquadSpawns,readonly duration=180){
    if(mode!=='turf'&&mode!=='squad')throw new RangeError('Unknown match mode.');
    if(!Number.isFinite(duration)||duration<=0)throw new RangeError('Match duration must be positive.');
    const defaults:SquadSpawns={cyan:ROSTER.map((_,i)=>({x:(i-2)*2,y:.9,z:24})),coral:ROSTER.map((_,i)=>({x:(i-2)*2,y:.9,z:-24}))};
    this.spawns={cyan:(spawns?.cyan??defaults.cyan).map(copy),coral:(spawns?.coral??defaults.coral).map(copy)};
    for(const points of [this.spawns.cyan,this.spawns.coral]){
      if(!points.length||points.some(p=>![p.x,p.y,p.z].every(Number.isFinite)))throw new RangeError('Each team needs finite spawn positions.');
    }
    this.remaining=duration;
    this.reset();
  }
  actor(id:string):Actor|undefined{return this.actors.find(a=>a.id===id);}
  get controlled():Actor{return this.actor(this.controlledId)!;}
  switchSlot(slot:Slot):boolean{
    if(!this.canAct)return false;
    const next=this.actors.find(a=>a.team===1&&a.slot===slot&&a.hp>0&&a.respawn===0);
    if(!next)return false;
    this.controlledId=next.id;return true;
  }
  private get canAct():boolean{return !this.paused&&!this.finished;}
  private living(id:string):Actor|undefined{
    const actor=this.actor(id);
    return this.canAct&&actor&&actor.hp>0&&actor.respawn===0?actor:undefined;
  }
  speed(actor:Actor):number{
    const base=HEROES[actor.hero].speed;
    return actor.abilityRemaining>0&&actor.hero==='runner'?base*2:base;
  }
  tryFire(id:string):ShotSpec|null{
    const a=this.living(id);if(!a||a.cooldown>0)return null;
    const def=HEROES[a.hero],count=a.hero==='breacher'&&a.abilityRemaining>0?3:1;
    const cost=def.inkCost*count;
    if(!Number.isFinite(a.ink)||a.ink<cost)return null;
    a.ink=Math.max(0,a.ink-cost);a.cooldown=def.fireInterval;
    const focused=a.hero==='ranger'&&a.abilityRemaining>0;
    return {ownerId:a.id,team:a.team,damage:def.damage*(focused?1.5:1),speed:def.projectileSpeed*(focused?1.3:1),count,spread:count>1?.08:0};
  }
  useAbility(id:string):boolean{
    const a=this.living(id);if(!a||a.abilityCooldown>0)return false;
    const def=HEROES[a.hero];a.abilityCooldown=def.abilityCooldown;a.abilityRemaining=def.abilityDuration;
    if(a.hero==='medic')for(const ally of this.actors){
      if(ally.team!==a.team||ally.hp<=0||ally.respawn>0)continue;
      const dx=ally.position.x-a.position.x,dy=ally.position.y-a.position.y,dz=ally.position.z-a.position.z;
      if(dx*dx+dy*dy+dz*dz<=36)ally.hp=Math.min(HEROES[ally.hero].maxHp,ally.hp+35);
    }
    return true;
  }
  damageActor(targetId:string,amount:number,attackerTeam:CombatTeam):boolean{
    if(!validAmount(amount)||!validTeam(attackerTeam))return false;
    const a=this.living(targetId);if(!a||a.team===attackerTeam)return false;
    const shield=a.hero==='anchor'&&a.abilityRemaining>0?.35:1;
    a.hp=Math.max(0,a.hp-amount*shield);
    if(a.hp===0){
      a.respawn=4;a.abilityRemaining=0;this.splats[attackerTeam]++;
      if(this.controlledId===a.id){const next=this.actors.find(other=>other.team===1&&other.hp>0&&other.respawn===0);if(next)this.controlledId=next.id;}
    }
    return true;
  }
  damageObjective(id:string,amount:number,attackerTeam:CombatTeam):boolean{
    if(!this.canAct||!validAmount(amount)||!validTeam(attackerTeam))return false;
    const o=this.objectives.find(o=>o.id===id);
    if(!o||o.team===attackerTeam||o.locked||o.hp<=0)return false;
    o.hp=Math.max(0,o.hp-amount);
    if(o.kind==='core'&&o.hp===0){this.finished=true;this.winner=attackerTeam;}
    if(o.kind==='bunker'){
      const locked=this.objectives.some(other=>other.team===o.team&&other.kind==='bunker'&&other.hp>0);
      const core=this.objectives.find(other=>other.team===o.team&&other.kind==='core');if(core)core.locked=locked;
    }
    return true;
  }
  update(dt:number,cyanCoverage=0,coralCoverage=0):void{
    if(!this.canAct||!validAmount(dt))return;
    const elapsed=Math.min(dt,this.remaining);this.remaining=Math.max(0,this.remaining-elapsed);
    for(const a of this.actors){
      a.cooldown=Math.max(0,a.cooldown-elapsed);a.abilityCooldown=Math.max(0,a.abilityCooldown-elapsed);a.abilityRemaining=Math.max(0,a.abilityRemaining-elapsed);
      if(a.respawn>0){a.respawn=Math.max(0,a.respawn-elapsed);if(a.respawn===0){a.position=copy(a.spawn);a.hp=HEROES[a.hero].maxHp;a.ink=100;a.cooldown=0;a.abilityCooldown=0;a.abilityRemaining=0;}}
    }
    if(this.remaining===0)this.finish(cyanCoverage,coralCoverage);
  }
  /** Timeout: objective health first, then painted floor. Destruction wins immediately. */
  finish(cyanCoverage=0,coralCoverage=0):void{
    if(this.finished)return;
    const health=(team:CombatTeam)=>this.objectives.filter(o=>o.team===team).reduce((sum,o)=>sum+o.hp,0);
    const cyanHealth=health(1),coralHealth=health(2);
    const cyan=Number.isFinite(cyanCoverage)?cyanCoverage:0,coral=Number.isFinite(coralCoverage)?coralCoverage:0;
    this.winner=cyanHealth>coralHealth?1:cyanHealth<coralHealth?2:cyan>coral?1:cyan<coral?2:0;
    this.finished=true;
  }
  reset():void{
    this.remaining=this.duration;this.paused=false;this.finished=false;this.winner=null;this.splats={1:0,2:0};this.actors=[];this.objectives=[];
    for(const team of [1,2] as const){
      const points=team===1?this.spawns.cyan:this.spawns.coral;
      const count=this.mode==='squad'?5:team===1?1:2;
      for(let i=0;i<count;i++){
        const hero=ROSTER[i],spawn=copy(points[i%points.length]);
        this.actors.push({id:team+'-'+(i+1),team,slot:(i+1) as Slot,hero,position:copy(spawn),spawn,hp:HEROES[hero].maxHp,ink:100,respawn:0,cooldown:0,abilityCooldown:0,abilityRemaining:0});
      }
      if(this.mode==='squad')for(const [kind,x,z] of [['bunker',-10,20],['bunker',10,20],['core',0,27]] as const){
        const maxHp=kind==='core'?500:300;
        this.objectives.push({id:team+'-'+kind+'-'+x,team,kind,position:{x,y:1.2,z:team===1?z:-z},hp:maxHp,maxHp,locked:kind==='core'});
      }
    }
    this.controlledId=this.actors[0].id;
  }
}
