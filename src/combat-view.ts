import * as THREE from 'three';
import type {Objective} from './combat';
export const objectiveRadius=(objective:Pick<Objective,'kind'>)=>objective.kind==='core'?2.2:1.8;
/** Team-colored, original reactor and bunker silhouettes, sharing runtime hit radii. */
export class ObjectiveView {
  group=new THREE.Group();
  private views=new Map<string,{root:THREE.Group;health:THREE.Mesh;shield:THREE.Mesh;light:THREE.Mesh}>();
  constructor(objectives:Objective[]){
    for(const objective of objectives){
      const root=new THREE.Group(),color=objective.team===1?0x20ddcf:0xff595e,radius=objectiveRadius(objective);
      root.position.set(objective.position.x,objective.position.y,objective.position.z);
      const shell=new THREE.MeshStandardMaterial({color:0x263548,metalness:.5,roughness:.37});
      const luminous=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.65,roughness:.25});
      const base=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius*1.06,.45,12),shell);base.position.y=-.95;root.add(base);
      const body=new THREE.Mesh(objective.kind==='core'?new THREE.CylinderGeometry(1.25,1.55,2,10):new THREE.BoxGeometry(2.7,1.8,2.5),shell);body.castShadow=true;body.receiveShadow=true;root.add(body);
      const light=new THREE.Mesh(objective.kind==='core'?new THREE.OctahedronGeometry(.85,1):new THREE.BoxGeometry(2.3,.4,2.56),luminous);light.position.y=objective.kind==='core'?.35:.2;root.add(light);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(radius*.78,.08,6,24),luminous);rim.rotation.x=Math.PI/2;rim.position.y=-.55;root.add(rim);
      const shield=new THREE.Mesh(new THREE.SphereGeometry(radius*1.05,16,10),new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:.1,depthWrite:false}));root.add(shield);
      const health=new THREE.Mesh(new THREE.BoxGeometry(radius*2,.12,.12),new THREE.MeshBasicMaterial({color}));health.position.y=1.7;root.add(health);
      this.views.set(objective.id,{root,health,shield,light});this.group.add(root);
    }
    this.update(objectives);
  }
  update(objectives:Objective[]){for(const objective of objectives){const view=this.views.get(objective.id);if(!view)continue;view.root.visible=objective.hp>0;view.health.scale.x=Math.max(.001,objective.hp/objective.maxHp);view.shield.visible=objective.locked;}}
  dispose(){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();this.group.traverse(node=>{if(node instanceof THREE.Mesh){geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.group.clear();this.views.clear();}
}
