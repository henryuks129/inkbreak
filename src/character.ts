import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface AvatarMotion { time:number; dt:number; speed:number; grounded:boolean; swimming:boolean; sliding?:boolean; firing:boolean; pitch:number }
export interface AvatarColors { bodyColor?:string; headColor?:string; accentColor?:string; skinColor?:string }
type Rig = Record<string,THREE.Bone>;

/** Original, metre-scale courier. Continuous skin weights bend limbs at actual joints. */
export function createAvatar(teamColor:string):THREE.Group {
 const root=new THREE.Group();root.name='InkbreakCourier';
 const humanoid=new THREE.Group();humanoid.name='courier-rig';
 const swimForm=new THREE.Group();swimForm.name='ink-ray';root.add(humanoid,swimForm);
 const materials=[
  new THREE.MeshStandardMaterial({color:teamColor,roughness:.68}),
  new THREE.MeshStandardMaterial({color:'#192e3b',roughness:.8}),
  new THREE.MeshStandardMaterial({color:'#e4ae8a',roughness:.48}),
  new THREE.MeshStandardMaterial({color:'#fff3df',roughness:.35}),
  new THREE.MeshStandardMaterial({color:teamColor,roughness:.28}),
  new THREE.MeshStandardMaterial({color:'#10212c',roughness:.22}),
  new THREE.MeshStandardMaterial({color:'#c9ff67',roughness:.3,metalness:.18}),
 ];
 const rig:Rig={};const bones:THREE.Bone[]=[];
 function bone(name:string,parent:THREE.Object3D,x:number,y:number,z=0){const b=new THREE.Bone();b.name=name;b.position.set(x,y,z);parent.add(b);rig[name]=b;bones.push(b);return b;}
 const hips=bone('hips',humanoid,0,.79), spine=bone('spine',hips,0,.32),neck=bone('neck',spine,0,.34),head=bone('head',neck,0,.18);
 for(const side of [-1,1]) {const suffix=side<0?'L':'R';const shoulder=bone('upperArm'+suffix,spine,side*.34,.18);const elbow=bone('forearm'+suffix,shoulder,0,-.29);bone('hand'+suffix,elbow,0,-.27);const hip=bone('thigh'+suffix,hips,side*.18,0);const knee=bone('shin'+suffix,hip,0,-.32);bone('foot'+suffix,knee,0,-.33);}
 humanoid.updateMatrixWorld(true);const origin=new THREE.Vector3();
 const pieces:THREE.BufferGeometry[][]=materials.map(()=>[]);
 function add(g:THREE.BufferGeometry,mat:number,b:THREE.Bone){g=g.index?g.toNonIndexed():g;g.deleteAttribute('uv');const n=g.getAttribute('position').count;const ids=new Uint16Array(n*4),weights=new Float32Array(n*4);for(let i=0;i<n;i++){ids[i*4]=bones.indexOf(b);weights[i*4]=1;}g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));pieces[mat].push(g);}
 function oval(b:THREE.Bone,mat:number,x:number,y:number,z:number,w:number,h:number,d:number){b.getWorldPosition(origin);const g=new THREE.SphereGeometry(1,16,b===head?12:8);g.scale(w/2,h/2,d/2);g.translate(origin.x+x,origin.y+y,origin.z+z);add(g,mat,b);}
 function tube(a:THREE.Bone,b:THREE.Bone,c:THREE.Bone,radii:number[],mat:number){
  const start=new THREE.Vector3(),middle=new THREE.Vector3(),end=new THREE.Vector3();a.getWorldPosition(start);b.getWorldPosition(middle);c.getWorldPosition(end);
  const length=start.y-end.y, joint=(start.y-middle.y)/length, rows=20,radial=14;const pos:number[]=[],ids:number[]=[],weights:number[]=[],index:number[]=[];
  for(let j=0;j<=rows;j++){const t=j/rows;const q=t*(radii.length-1),k=Math.min(radii.length-2,Math.floor(q)),radius=THREE.MathUtils.lerp(radii[k],radii[k+1],q-k);const blend=THREE.MathUtils.smoothstep(t,joint-.14,joint+.14);
   for(let i=0;i<=radial;i++){const angle=i/radial*Math.PI*2;pos.push(start.x+Math.cos(angle)*radius,start.y-t*length,start.z+Math.sin(angle)*radius*.91);ids.push(bones.indexOf(a),bones.indexOf(b),0,0);weights.push(1-blend,blend,0,0);if(j<rows&&i<radial){const v=j*(radial+1)+i;index.push(v,v+1,v+radial+1,v+1,v+radial+2,v+radial+1);}}
  }
  const top=pos.length/3;pos.push(start.x,start.y,start.z,end.x,end.y,end.z);ids.push(bones.indexOf(a),0,0,0,bones.indexOf(b),0,0,0);weights.push(1,0,0,0,1,0,0,0);for(let i=0;i<radial;i++){index.push(top,i+1,i);const v=rows*(radial+1)+i;index.push(top+1,v,v+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));g.setIndex(index);g.computeVertexNormals();pieces[mat].push(g.toNonIndexed());g.dispose();
 }
 oval(spine,0,0,-.03,0,.61,.7,.4);oval(hips,1,0,.015,0,.69,.38,.43);
 oval(neck,2,0,-.035,0,.18,.2,.18);oval(head,2,0,.045,-.015,.68,.67,.59);
 // Distinct forehead crest, swept rear hair and sculpted side locks.
 
 for(const side of [-1,1]){const s=side<0?'L':'R';
  oval(head,2,side*.33,.035,0,.14,.22,.13);

  oval(head,5,side*.15,.065,-.267,.295,.235,.06);
  oval(head,3,side*.15,.07,-.294,.225,.18,.04);
  oval(head,6,side*.15,.07,-.318,.102,.14,.025);
  oval(head,5,side*.15,.07,-.333,.045,.1,.012);
  oval(head,3,side*.135,.103,-.343,.027,.035,.01);
  oval(head,4,side*.15,.207,-.262,.24,.045,.045);
  tube(rig['upperArm'+s],rig['forearm'+s],rig['hand'+s],[.12,.125,.095,.087,.08],2);
  oval(rig['upperArm'+s],0,0,.015,0,.295,.24,.295);
  rig['upperArm'+s].getWorldPosition(origin);const sleeve=new THREE.CylinderGeometry(.147,.14,.16,20);sleeve.translate(origin.x,origin.y-.075,origin.z);add(sleeve,0,rig['upperArm'+s]);
  oval(rig['hand'+s],1,0,-.045,-.012,.19,.19,.19);
  tube(rig['thigh'+s],rig['shin'+s],rig['foot'+s],[.135,.14,.105,.095,.085],1);
  oval(rig['foot'+s],3,0,-.025,-.09,.3,.19,.46);
  oval(rig['foot'+s],1,0,-.105,-.085,.31,.065,.47);
  oval(rig['foot'+s],0,0,.035,-.12,.26,.08,.23);
 }
 oval(head,2,0,-.015,-.303,.11,.12,.13);oval(head,5,0,-.15,-.284,.16,.025,.025);
 // Sewn collar and chest badge; backpack reservoir is tied to the spine.
 oval(neck,1,0,-.08,0,.36,.12,.31);oval(spine,3,-.12,.1,-.201,.12,.14,.025);
 oval(spine,1,0,-.015,.25,.46,.55,.2);oval(spine,4,0,0,.36,.34,.53,.31);
 oval(spine,3,0,.26,.36,.37,.08,.33);oval(spine,1,0,-.27,.36,.37,.08,.33);
 for(const side of [-1,1])oval(spine,1,side*.22,.04,-.02,.07,.54,.43);
 for(const y of [-.12,0,.12])oval(spine,3,0,y,.52,.14,.03,.018);
 // Side-mounted compact pressure blaster follows the wrist bone.
 const hand=rig.handR;oval(hand,1,0,-.05,-.19,.25,.23,.58);oval(hand,0,0,.075,-.18,.27,.1,.35);oval(hand,3,0,-.05,-.49,.17,.17,.12);oval(hand,5,0,-.05,-.555,.105,.105,.018);oval(hand,6,0,.13,-.3,.055,.05,.06);
 const mergedByMaterial:THREE.BufferGeometry[]=[];
 for(const group of pieces){const g=mergeGeometries(group,false)!;mergedByMaterial.push(g);group.forEach(p=>p.dispose());}
 const geometry=mergeGeometries(mergedByMaterial,true)!;mergedByMaterial.forEach(g=>g.dispose());
 const mesh=new THREE.SkinnedMesh(geometry,materials);mesh.name='courier-smooth-skin';mesh.castShadow=true;mesh.frustumCulled=false;humanoid.add(mesh);const skeleton=new THREE.Skeleton(bones);mesh.bind(skeleton);mesh.normalizeSkinWeights();
 // Smooth original ray silhouette, separate from the biped rig.
 const swimParts:THREE.BufferGeometry[]=[];
 function rayOval(x:number,y:number,z:number,w:number,h:number,d:number){const g=new THREE.SphereGeometry(1,16,10);g.scale(w/2,h/2,d/2);g.translate(x,y,z);swimParts.push(g.toNonIndexed());g.dispose();}
 rayOval(0,.2,0,.68,.25,1.04);for(const s of [-1,1]){rayOval(s*.35,.17,.06,.65,.12,.66);rayOval(s*.16,.12,.54,.13,.12,.63);}
 const rayGeometry=mergeGeometries(swimParts,false)!;swimParts.forEach(g=>g.dispose());const ray=new THREE.Mesh(rayGeometry,materials[4]);ray.castShadow=true;swimForm.add(ray);swimForm.visible=false;
 root.userData={humanoid,swimForm,rig,skinMesh:mesh,materials,leftLeg:rig.thighL,rightLeg:rig.thighR,leftArm:rig.upperArmL,rightArm:rig.upperArmR,gun:rig.handR,torso:mesh,rigVersion:1};
 setAvatarStyle(root,{body:'male',primaryColor:teamColor,secondaryColor:'#c9ff67',skinColor:'#e4ae8a',hairColor:teamColor,hair:'braids',hat:'none',accessory:'backpack'});
 updateAvatar(root,{time:0,dt:1/60,speed:0,grounded:true,swimming:false,firing:false,pitch:0});return root;
}

export function setAvatarAppearance(root:THREE.Group,colors:AvatarColors){const mats=root.userData.materials as THREE.MeshStandardMaterial[]|undefined;if(!mats)return;for(const [key,index] of [['bodyColor',0],['headColor',4],['accentColor',6],['skinColor',2]] as const){const value=colors[key];if(value&&/^#[0-9a-f]{6}$/i.test(value))mats[index].color.set(value);}}

export function updateAvatar(root:THREE.Group,state:AvatarMotion){
 const r=root.userData.rig as Rig|undefined;if(!r)return;const humanoid=root.userData.humanoid as THREE.Group,swim=root.userData.swimForm as THREE.Group;
 const moving=THREE.MathUtils.clamp(state.speed/5,0,1),phase=state.time*12,step=Math.sin(phase)*moving;
 humanoid.visible=!state.swimming;humanoid.scale.set(1,1,1);swim.visible=state.swimming;
 swim.position.y=Math.sin(state.time*10)*.025;swim.rotation.z=Math.sin(state.time*8)*.035;
 r.hips.position.y=.79+Math.abs(Math.sin(phase))*.035*moving+Math.sin(state.time*2.5)*.008*(1-moving)-(state.sliding?.19:0);
 r.hips.rotation.set(state.sliding?-.32:0,Math.sin(phase)*.045*moving,0);r.spine.rotation.set(state.sliding?-.42:-.07*moving,Math.sin(phase)*-.055*moving,0);
 r.head.rotation.set(THREE.MathUtils.clamp(state.pitch,-.7,.7)*.28,0,Math.sin(state.time*2)*.012);
 for(const side of [-1,1]){const suffix=side<0?'L':'R',stride=step*side;r['thigh'+suffix].rotation.set(state.sliding?-.95:state.grounded?stride*.57:-.3,0,side*.025);r['shin'+suffix].rotation.x=state.sliding?-.95:state.grounded?-Math.max(0,-stride)*.85:-.65;r['foot'+suffix].rotation.x=-r['shin'+suffix].rotation.x*.24;
  r['upperArm'+suffix].rotation.set(.92+state.pitch*.65+(side<0?.1:0),0,side*-.12);r['forearm'+suffix].rotation.set(.78,side*-.13,side*.08);r['hand'+suffix].rotation.set(-1.7,0,0);if(side<0){r['upperArm'+suffix].rotation.z=.9;r['forearm'+suffix].rotation.z=.45;r['forearm'+suffix].rotation.x=.3;}
 }
 if(state.firing){r.upperArmR.rotation.x+=Math.max(0,Math.sin(state.time*45))*.075;r.spine.rotation.x+=Math.sin(state.time*45)*.012;}
 humanoid.updateMatrixWorld(true);
}

export interface AvatarStyle {
 body:'male'|'female';primaryColor:string;secondaryColor:string;skinColor:string;hairColor:string;
 hair:'short'|'afro'|'braids'|'bun'|'ponytail'|'dreads'|'bald';
 hat:'none'|'cap'|'beanie'|'tophat'|'crown';
 accessory:'none'|'glasses'|'earrings'|'beard'|'scarf'|'backpack';
}
/** Host identity is represented on the actual playable mesh, including silhouette choices. */
export function setAvatarStyle(root:THREE.Group,style:AvatarStyle){
 const rig=root.userData.rig as Rig|undefined;if(!rig)return;
 setAvatarAppearance(root,{bodyColor:style.primaryColor,accentColor:style.secondaryColor,skinColor:style.skinColor,headColor:style.hairColor});
 for(const previous of [root.userData.identityParts,root.userData.identityBackpack] as (THREE.Group|undefined)[]){if(previous){previous.removeFromParent();previous.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});}}
 root.userData.identityBackpack=undefined;
 const group=new THREE.Group();group.name='startng-identity';rig.head.add(group);root.userData.identityParts=group;root.userData.style={...style};
 const materials=root.userData.materials as THREE.MeshStandardMaterial[];if(/^#[0-9a-f]{6}$/i.test(style.secondaryColor))materials[1].color.set(style.secondaryColor);const chunks=new Map<number,THREE.BufferGeometry[]>();
 function add(g:THREE.BufferGeometry,m:number,x:number,y:number,z:number,rz=0){g.rotateZ(rz);g.translate(x,y,z);const gs=chunks.get(m)||[];gs.push(g.toNonIndexed());g.dispose();chunks.set(m,gs);}
 function ball(m:number,x:number,y:number,z:number,w:number,h:number,d:number,rz=0){const g=new THREE.SphereGeometry(1,12,8);g.scale(w/2,h/2,d/2);add(g,m,x,y,z,rz);}
 function cylinder(m:number,x:number,y:number,z:number,r:number,h:number,rt=r){add(new THREE.CylinderGeometry(rt,r,h,20),m,x,y,z);}
 const hair=style.hair;
 if(hair==='short'){ball(4,0,.29,.025,.73,.34,.61);for(const side of [-1,1])ball(4,side*.29,.14,.05,.14,.3,.32);}
 if(hair==='afro'){for(let i=0;i<14;i++){const a=i/14*Math.PI*2;ball(4,Math.cos(a)*.29,.23+Math.sin(a)*.19,.07,.29,.29,.5);}ball(4,0,.34,.04,.68,.4,.61);}
 if(['braids','dreads','bun','ponytail'].includes(hair)){ball(4,0,.27,.04,.73,.31,.6);ball(4,0,.15,.22,.66,.4,.24);}
 if(hair==='braids'||hair==='dreads'){for(const side of [-1,1]){const count=hair==='braids'?2:4;for(let j=0;j<count;j++){const z=.02+j*.09;for(let k=0;k<5;k++)ball(4,side*(.3+.015*Math.sin(k*2)),.12-k*.11,z,.13,.17,.14);ball(6,side*.3,-.32,z,.14,.055,.15);}}}
 if(hair==='bun'){ball(4,0,.37,.27,.34,.34,.34);ball(6,0,.27,.26,.35,.06,.31);}
 if(hair==='ponytail'){ball(6,0,.2,.32,.21,.18,.16);ball(4,0,-.02,.38,.25,.55,.27);}
 if(style.hat==='cap'){ball(0,0,.32,.01,.79,.3,.66);ball(0,0,.245,-.31,.73,.065,.46);ball(6,0,.34,-.302,.13,.105,.03);}
 if(style.hat==='beanie'){ball(0,0,.34,.025,.78,.38,.66);cylinder(0,0,.24,.025,.37,.12);ball(6,0,.55,.025,.13,.13,.13);}
 if(style.hat==='tophat'){cylinder(1,0,.28,.025,.47,.055);cylinder(1,0,.51,.025,.31,.43);cylinder(6,0,.34,.025,.315,.09);}
 if(style.hat==='crown'){cylinder(6,0,.32,.025,.36,.1);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;add(new THREE.ConeGeometry(.075,.2,4),6,Math.cos(a)*.32,.45,Math.sin(a)*.29+.025);}}
 const accessory=style.accessory;
 if(accessory==='glasses'){for(const side of [-1,1]){const ring=new THREE.TorusGeometry(.135,.022,6,18);add(ring,1,side*.15,.07,-.345);}ball(1,0,.09,-.348,.09,.035,.025);}
 if(accessory==='earrings'){for(const side of [-1,1])add(new THREE.TorusGeometry(.065,.015,6,16),6,side*.36,-.075,-.025);}
 if(accessory==='beard'){ball(4,0,-.205,-.12,.47,.22,.37);ball(4,-.16,-.11,-.21,.16,.22,.16);ball(4,.16,-.11,-.21,.16,.22,.16);}
 if(accessory==='scarf'){ball(6,0,-.3,0,.48,.18,.4);ball(6,.18,-.52,-.12,.15,.43,.1,-.2);}
 if(accessory==='backpack'){const pack=new THREE.Group();pack.name='identity-backpack';rig.spine.add(pack);root.userData.identityBackpack=pack;for(const [index,x,y,z,w,h,d] of [[0,0,-.03,.42,.56,.57,.27],[6,0,-.07,.57,.35,.2,.1]]){const geometry=new THREE.SphereGeometry(1,16,10);geometry.scale(w/2,h/2,d/2);const mesh=new THREE.Mesh(geometry,materials[index]);mesh.position.set(x,y,z);mesh.castShadow=true;pack.add(mesh);}}
 for(const [index,geometries] of chunks){const merged=mergeGeometries(geometries,false)!;geometries.forEach(g=>g.dispose());const mesh=new THREE.Mesh(merged,materials[index]);mesh.castShadow=true;group.add(mesh);}
 // Body selection changes shoulder/hip proportions while keeping identical movement reach.
 rig.upperArmL.position.x=style.body==='female'?-.315:-.34;rig.upperArmR.position.x=style.body==='female'?.315:.34;
 rig.thighL.position.x=style.body==='female'?-.195:-.18;rig.thighR.position.x=style.body==='female'?.195:.18;
 humanoidUpdate(root);
}
function humanoidUpdate(root:THREE.Group){(root.userData.humanoid as THREE.Group).updateMatrixWorld(true);}
