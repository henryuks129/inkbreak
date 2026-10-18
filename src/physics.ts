import RAPIER from '@dimforge/rapier3d-compat';
import {getArenaRamps, getRampVertices, type ArenaDefinition} from './arenas.ts';
export class Physics {
  world: RAPIER.World;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
  grounded = false;
  actors=new Map<string,{body:RAPIER.RigidBody,collider:RAPIER.Collider,controller:RAPIER.KinematicCharacterController,grounded:boolean}>();
  constructor(arena:ArenaDefinition) {
    this.world = new RAPIER.World({x:0,y:-25,z:0});
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(30,.5,30).setTranslation(0,-.5,0));
    for (const b of arena.obstacles) this.world.createCollider(RAPIER.ColliderDesc.cuboid(b.w/2,b.h/2,b.d/2).setTranslation(b.x,(b.y??0)+b.h/2,b.z));
    for (const ramp of getArenaRamps(arena)) {
      const hull = RAPIER.ColliderDesc.convexHull(getRampVertices(ramp));
      if (!hull) throw new Error('Invalid arena ramp hull.');
      this.world.createCollider(hull.setTranslation(ramp.x, 0, ramp.z));
    }
    for (const [x,z,w,d] of [[0,-30.5,61,1],[0,30.5,61,1],[-30.5,0,1,61],[30.5,0,1,61]]) this.world.createCollider(RAPIER.ColliderDesc.cuboid(w/2,5,d/2).setTranslation(x,4,z));
    this.body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(arena.spawn[0],1.05,arena.spawn[1]));
    this.collider = this.world.createCollider(RAPIER.ColliderDesc.capsule(.45,.42),this.body);
    this.controller=this.world.createCharacterController(.025);
    this.controller.enableAutostep(.32,.2,true);
    this.controller.enableSnapToGround(.2);
    this.controller.setMaxSlopeClimbAngle(Math.PI/4);
  }
  addActor(id:string,x:number,z:number){
    if(this.actors.size===0){this.teleport(x,z);this.actors.set(id,{body:this.body,collider:this.collider,controller:this.controller,grounded:false});return;}
    const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x,1.05,z));
    const collider=this.world.createCollider(RAPIER.ColliderDesc.capsule(.45,.42),body),controller=this.world.createCharacterController(.025);
    controller.enableAutostep(.32,.2,true);controller.enableSnapToGround(.2);controller.setMaxSlopeClimbAngle(Math.PI/4);
    this.actors.set(id,{body,collider,controller,grounded:false});
  }
  moveActor(id:string,x:number,y:number,z:number){const a=this.actors.get(id);if(!a)return;
    a.controller.computeColliderMovement(a.collider,{x,y,z});const m=a.controller.computedMovement(),p=a.body.translation();
    a.body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});a.grounded=a.controller.computedGrounded();
  }
  addObstacle(x:number,z:number,radius:number,height:number){return this.world.createCollider(RAPIER.ColliderDesc.cylinder(height/2,radius).setTranslation(x,height/2,z));}
  step(dt:number){this.world.timestep=dt;this.world.step();}
  teleportActor(id:string,x:number,z:number){const a=this.actors.get(id);if(!a)return;a.body.setTranslation({x,y:1.05,z},true);a.body.setNextKinematicTranslation({x,y:1.05,z});a.grounded=false;}
  move(x:number,y:number,z:number,dt:number) {
    this.controller.computeColliderMovement(this.collider,{x,y,z});const m=this.controller.computedMovement(),p=this.body.translation();
    this.body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});this.grounded=this.controller.computedGrounded();this.step(dt);return this.body.translation();
  }
  teleport(x:number,z:number) {this.body.setTranslation({x,y:1.05,z},true);this.body.setNextKinematicTranslation({x,y:1.05,z});}
  dispose(){this.world.free();}
}
export async function initPhysics(){await RAPIER.init();}
