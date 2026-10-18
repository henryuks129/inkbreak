import test from 'node:test';
import assert from 'node:assert/strict';
import {SquadMatch,HEROES} from './combat.ts';

test('squad has ten independent heroes and swaps preserve damage, ink and cooldown',()=>{
 const m=new SquadMatch();assert.equal(m.actors.length,10);assert.equal(m.objectives.length,6);
 assert.equal(new Set(m.actors.filter(a=>a.team===1).map(a=>a.hero)).size,5);
 const first=m.controlled;assert.equal(m.damageActor(first.id,20,2),true);const shot=m.tryFire(first.id);assert.ok(shot);
 const hp=first.hp,ink=first.ink,cooldown=first.cooldown;
 assert.equal(m.switchSlot(2),true);assert.equal(m.switchSlot(1),true);
 assert.equal(m.controlled,first);assert.equal(first.hp,hp);assert.equal(first.ink,ink);assert.equal(first.cooldown,cooldown);
 assert.equal(m.switchSlot(6 as 1),false);
});

test('friendly fire, invalid damage, dry tanks and cooldowns cannot bypass combat rules',()=>{
 const m=new SquadMatch();const a=m.controlled;
 assert.equal(m.damageActor(a.id,40,1),false);assert.equal(m.damageActor(a.id,NaN,2),false);
 assert.ok(m.tryFire(a.id));assert.equal(m.tryFire(a.id),null);
 m.update(1);a.ink=0;assert.equal(m.tryFire(a.id),null);
 m.paused=true;m.update(20);assert.equal(m.remaining,179);assert.equal(m.tryFire(m.actors[1].id),null);assert.equal(m.useAbility(a.id),false);
});

test('core protection follows bunker destruction and core destruction ends the match',()=>{
 const m=new SquadMatch();const enemy=m.objectives.filter(o=>o.team===2),core=enemy.find(o=>o.kind==='core')!;
 assert.equal(core.locked,true);assert.equal(m.damageObjective(core.id,9999,1),false);
 for(const b of enemy.filter(o=>o.kind==='bunker'))assert.equal(m.damageObjective(b.id,9999,1),true);
 assert.equal(core.locked,false);assert.equal(m.damageObjective(core.id,9999,1),true);
 assert.equal(m.finished,true);assert.equal(m.winner,1);assert.equal(m.damageActor(m.controlled.id,999,2),false);
});

test('timeout compares remaining objective health then turf and preserves exact draws',()=>{
 const damaged=new SquadMatch('squad',undefined,1);damaged.damageObjective(damaged.objectives.find(o=>o.team===2&&o.kind==='bunker')!.id,10,1);damaged.update(1,1,90);assert.equal(damaged.winner,1);
 const turf=new SquadMatch('squad',undefined,1);turf.update(1,20,30);assert.equal(turf.winner,2);
 const draw=new SquadMatch('squad',undefined,1);draw.update(1,30,30);assert.equal(draw.winner,0);
 const pureTurf=new SquadMatch('turf',undefined,1);assert.equal(pureTurf.actors.length,3);assert.equal(pureTurf.objectives.length,0);pureTurf.update(1,40,10);assert.equal(pureTurf.winner,1);
});

test('splatted heroes cannot act or be selected and respawn at their own spawn',()=>{
 const m=new SquadMatch();const a=m.controlled;a.position.x=5;assert.equal(m.damageActor(a.id,9999,2),true);
 assert.equal(a.hp,0);assert.ok(a.respawn>0);assert.notEqual(m.controlledId,a.id);assert.equal(m.switchSlot(a.slot),false);assert.equal(m.tryFire(a.id),null);assert.equal(m.useAbility(a.id),false);
 m.update(4);assert.equal(a.hp,HEROES[a.hero].maxHp);assert.equal(a.respawn,0);assert.deepEqual(a.position,a.spawn);assert.equal(m.switchSlot(a.slot),true);
});

test('abilities are per hero: dash, shield, burst, heal and precision',()=>{
 const m=new SquadMatch();const [runner,anchor,breacher,medic,ranger]=m.actors;
 assert.ok(m.useAbility(runner.id));assert.ok(m.speed(runner)>HEROES.runner.speed);assert.equal(m.useAbility(runner.id),false);
 assert.ok(m.useAbility(anchor.id));m.damageActor(anchor.id,100,2);assert.equal(anchor.hp,HEROES.anchor.maxHp-35);
 assert.ok(m.useAbility(breacher.id));assert.equal(m.tryFire(breacher.id)!.count,3);
 runner.hp=50;runner.position={...medic.position};const distant=m.actors.find(a=>a.team===2)!;distant.hp=50;assert.ok(m.useAbility(medic.id));assert.equal(runner.hp,85);assert.equal(distant.hp,50);
 assert.ok(m.useAbility(ranger.id));assert.ok(m.tryFire(ranger.id)!.damage>HEROES.ranger.damage);
});

test('reset restores objective locks and actor state without changing configured spawns',()=>{
 const m=new SquadMatch();m.damageActor(m.controlledId,50,2);m.useAbility(m.controlledId);m.switchSlot(3);m.update(20);m.reset();
 assert.equal(m.remaining,180);assert.equal(m.finished,false);assert.equal(m.winner,null);assert.equal(m.controlled.slot,1);assert.equal(m.controlled.hp,HEROES.runner.maxHp);assert.equal(m.controlled.abilityCooldown,0);assert.equal(m.objectives.filter(o=>o.kind==='core'&&o.locked).length,2);
});
