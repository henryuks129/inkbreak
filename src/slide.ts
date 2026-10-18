import {getArenaRamps,getRampVertices,type ArenaDefinition} from './arenas.ts';

/** Sample the same wedge surface used by rendering and Rapier. */
export function downhillAt(arena:ArenaDefinition,x:number,y:number,z:number){
  for(const ramp of getArenaRamps(arena)){
    const localX=x-ramp.x,localZ=z-ramp.z;
    if(Math.abs(localX)>ramp.w/2-.28||Math.abs(localZ)>ramp.d/2-.28)continue;
    const vertices=getRampVertices(ramp),lowZ=vertices[8],highZ=vertices[14],lowY=vertices[7],highY=vertices[13];
    const ratio=(localZ-lowZ)/(highZ-lowZ),surfaceY=lowY+(highY-lowY)*ratio;
    if(Math.abs(y-(surfaceY+1.05))>.75)continue;
    return {x:0,z:Math.sign(lowZ-highZ),steepness:Math.abs(highY-lowY)/Math.abs(highZ-lowZ)};
  }
  return null;
}
