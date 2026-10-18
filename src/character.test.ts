import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAvatar, updateAvatar, setAvatarAppearance, setAvatarStyle } from './character.ts';

test('courier has normalized continuous joint weights and a bounded render budget',()=>{
 const avatar=createAvatar('#00d5c8');const mesh=avatar.userData.skinMesh as THREE.SkinnedMesh;
 assert.equal(mesh.isSkinnedMesh,true);assert.ok(mesh.skeleton.bones.length===16);
 const weights=mesh.geometry.getAttribute('skinWeight');let blended=0;
 for(let i=0;i<weights.count;i++){const sum=weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i);assert.ok(Math.abs(sum-1)<1e-5);if(weights.getX(i)>0&&weights.getY(i)>0)blended++;}
 assert.ok(blended>200,'elbows and knees must deform across multiple bones');
 assert.ok(mesh.geometry.getAttribute('position').count/3<20000);assert.equal(mesh.geometry.groups.length,7);
});
test('run animation deforms vertices, swimming changes form and skin can be personalized',()=>{
 const avatar=createAvatar('#00d5c8');const mesh=avatar.userData.skinMesh as THREE.SkinnedMesh;
 const rest=mesh.geometry.getAttribute('position');const vertex=new THREE.Vector3();let sample=-1;const weights=mesh.geometry.getAttribute('skinWeight');for(let i=0;i<weights.count;i++){if(weights.getX(i)>.1&&weights.getY(i)>.1&&rest.getY(i)<.7){sample=i;break;}}
 assert.ok(sample>=0);mesh.skeleton.update();vertex.fromBufferAttribute(rest,sample);mesh.applyBoneTransform(sample,vertex);const before=vertex.clone();
 updateAvatar(avatar,{time:.11,dt:1/60,speed:5,grounded:true,swimming:false,firing:true,pitch:.2});mesh.skeleton.update();vertex.fromBufferAttribute(rest,sample);mesh.applyBoneTransform(sample,vertex);assert.ok(before.distanceTo(vertex)>.01);
 updateAvatar(avatar,{time:.2,dt:1/60,speed:8,grounded:true,swimming:true,firing:false,pitch:0});assert.equal(avatar.userData.humanoid.visible,false);assert.equal(avatar.userData.swimForm.visible,true);
 setAvatarAppearance(avatar,{bodyColor:'#ff4455',skinColor:'#754b35'});assert.equal(avatar.userData.materials[0].color.getHexString(),'ff4455');assert.equal(avatar.userData.materials[2].color.getHexString(),'754b35');
});

test('every supported host identity choice produces finite geometry and applies colors',()=>{
 const avatar=createAvatar('#00d5c8');
 const base={body:'female',primaryColor:'#345678',secondaryColor:'#abcdef',skinColor:'#815035',hairColor:'#28251f',hair:'short',hat:'none',accessory:'none'} as const;
 for(const hair of ['short','afro','braids','bun','ponytail','dreads','bald'] as const)for(const hat of ['none','cap','beanie','tophat','crown'] as const)for(const accessory of ['none','glasses','earrings','beard','scarf','backpack'] as const){
 setAvatarStyle(avatar,{...base,hair,hat,accessory});avatar.userData.identityParts.traverse((obj:THREE.Object3D)=>{if(obj instanceof THREE.Mesh){const p=obj.geometry.getAttribute('position');for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));}});
 }
 assert.equal(avatar.userData.materials[0].color.getHexString(),'345678');assert.equal(avatar.userData.materials[4].color.getHexString(),'28251f');assert.equal(avatar.userData.materials[1].color.getHexString(),'abcdef');
 assert.equal(avatar.userData.identityBackpack.parent,avatar.userData.rig.spine);
});

test('knees bend backward during running and airborne tuck',()=>{
 const avatar=createAvatar('#00d5c8');
 updateAvatar(avatar,{time:.11,dt:1/60,speed:5,grounded:true,swimming:false,firing:false,pitch:0});
 assert.ok(avatar.userData.rig.shinL.rotation.x<-.1);assert.ok(avatar.userData.rig.shinR.rotation.x<=0);
 updateAvatar(avatar,{time:.11,dt:1/60,speed:5,grounded:false,swimming:false,firing:false,pitch:0});
 assert.ok(avatar.userData.rig.shinL.rotation.x<0&&avatar.userData.rig.shinR.rotation.x<0);
});
