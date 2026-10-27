import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getArenaRamps, getRampVertices, type ArenaDefinition } from './arenas';

const material = (color: string, roughness = .78) => new THREE.MeshStandardMaterial({ color, roughness });
function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, bevel = 0) {
  const geometry=bevel?new RoundedBoxGeometry(w,h,d,2,Math.min(bevel,w/4,h/4,d/4)):new THREE.BoxGeometry(w,h,d);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
function cylinder(radius: number, height: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), mat);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
function canvasTexture(draw: (ctx: CanvasRenderingContext2D) => void, w = 512, h = 256) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class ArenaView {
  group = new THREE.Group();
  ground: THREE.Mesh;
  paintCanvas = document.createElement('canvas');
  paintTexture: THREE.CanvasTexture;
  constructor(arena: ArenaDefinition) {
    const concrete = canvasTexture(ctx => {
      ctx.fillStyle = arena.ground; ctx.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 12000; i++) {
        const x = (i * 73.43) % 512, y = (i * 47.71) % 256;
        ctx.fillStyle = i % 2 ? '#ffffff09' : '#0000000a'; ctx.fillRect(x, y, 1.5, 1.5);
      }
      ctx.strokeStyle = '#262a2b18'; ctx.lineWidth = 1;
      for (let x = 0; x < 512; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, 128); ctx.lineTo(512, 128); ctx.stroke();
    });
    concrete.wrapS = concrete.wrapT = THREE.RepeatWrapping; concrete.repeat.set(8, 8);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), new THREE.MeshStandardMaterial({ map: concrete, roughness: .92 }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true; this.group.add(this.ground);
    this.paintCanvas.width = this.paintCanvas.height = 1024;
    this.paintTexture = new THREE.CanvasTexture(this.paintCanvas);
    // With PlaneGeometry rotated -PI/2, canvas top maps to world -Z under flipY=true.
    this.paintTexture.flipY = true; this.paintTexture.colorSpace = THREE.SRGBColorSpace;
    const ink = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: this.paintTexture, transparent: true, roughness: .32, metalness: .06, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    ink.rotation.x = -Math.PI / 2; ink.position.y = .014; ink.receiveShadow = true; this.group.add(ink);
    const dark = material('#33434b'), light = material('#ddd9cb'), accent = material(arena.accent);
    const line = material('#f1ead4');
    // Painted perimeter, transverse court lines and launch-zone chevrons.
    for (const x of [-29, 29]) this.group.add(box(.11, .009, 58, line, x, .007, 0));
    for (const z of [-29, 29]) this.group.add(box(58, .009, .11, line, 0, .007, z));
    for (const z of [-20, 20]) for (let x = -26; x <= 26; x += 4) this.group.add(box(2, .009, .12, line, x, .008, z));
    for (const side of [-1, 1]) {
      const pad = cylinder(2.4, .035, material(side === 1 ? '#36c5e0' : '#ff765c'), 0, .02, side * 25);
      this.group.add(pad);
      for (let i = -1; i <= 1; i++) {
        const arrow = box(.18, .01, 1.1, line, i * .65, .045, side * 25); arrow.rotation.y = side * .5; this.group.add(arrow);
      }
    }
    arena.obstacles.forEach((b, i) => {
      const cover = box(b.w, b.h, b.d, material(b.color ?? (i % 3 === 0 ? '#c5c7bd' : '#a2aaa4')), b.x, (b.y ?? 0) + b.h / 2, b.z, .09);
      this.group.add(cover);
      this.group.add(box(b.w + .035, .07, b.d + .035, light, b.x, (b.y ?? 0) + b.h - .035, b.z));
      if (b.h > 2) {
        const stripe = box(b.w + .045, .18, b.d + .045, i % 2 ? accent : dark, b.x, (b.y ?? 0) + .48, b.z);
        this.group.add(stripe);
        if (arena.id === 'freight-frequency') {
          // Shallow corrugation follows the container face without changing its playable footprint.
          const rib = material(b.color ?? '#829a98');
          for (let offset = -b.w / 2 + .35; offset < b.w / 2; offset += .55) for (const side of [-1, 1]) {
            this.group.add(box(.055, b.h - .22, .03, rib, b.x + offset, (b.y ?? 0) + b.h / 2, b.z + side * (b.d / 2 + .015)));
          }
          for (let offset = -b.d / 2 + .35; offset < b.d / 2; offset += .55) for (const side of [-1, 1]) {
            this.group.add(box(.03, b.h - .22, .055, rib, b.x + side * (b.w / 2 + .015), (b.y ?? 0) + b.h / 2, b.z + offset));
          }
        }
      }
    });
    if (arena.id === 'freight-frequency') {
      const crane = material('#d5a44e');
      for (const x of [-34, 34]) {
        this.group.add(box(.65, 15, .65, crane, x, 7.5, -22));
        this.group.add(box(2.4, .7, 5, dark, x, .35, -22));
        this.group.add(box(.45, .45, 20, crane, x, 15, -22));
        this.group.add(box(.4, 4, .4, crane, x, 13, -30));
        const brace = box(.25, 4.6, .25, crane, x, 13.4, -20.5); brace.rotation.x = -.7; this.group.add(brace);
        this.group.add(cylinder(.025, 7, dark, x, 10.8, -16));
        this.group.add(box(.45, .45, .45, crane, x, 7.25, -16));
      }
    }
    if (arena.id === 'relay-works') {
      // High open trusses suggest a converted factory without occluding the chase camera.
      const steel = material('#586f71'), roof = material('#b4bcb2');
      for (const z of [-26, -13, 0, 13, 26]) {
        for (const x of [-32, 32]) {
          this.group.add(box(.48, 10.3, .48, steel, x, 5.15, z));
          this.group.add(box(.9, .6, .9, dark, x, .3, z));
        }
        this.group.add(box(64, .24, .24, steel, 0, 10.3, z));
        for (let x = -28; x <= 28; x += 8) {
          const diagonal = box(8.3, .14, .14, steel, x, 11.1, z);
          diagonal.rotation.z = ((x + 28) / 8 % 2 === 0 ? 1 : -1) * .2; this.group.add(diagonal);
        }
        this.group.add(box(64, .18, .18, steel, 0, 11.9, z));
      }
      // Perimeter eaves and widely spaced slats leave the central field open to the sky.
      for (const x of [-30, 30]) this.group.add(box(5, .16, 60, roof, x, 12.1, 0));
      for (const z of [-27, -14, 0, 14, 27]) this.group.add(box(58, .07, .5, roof, 0, 12.15, z));
    }
    for (const ramp of getArenaRamps(arena)) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(getRampVertices(ramp), 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0], 2));
      geometry.setIndex([0, 1, 3, 0, 3, 2, 0, 4, 5, 0, 5, 1, 0, 2, 4, 1, 5, 3, 4, 2, 3, 4, 3, 5]);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material('#b8bdb4'));
      mesh.position.set(ramp.x, 0, ramp.z); mesh.castShadow = true; mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    // Each shelter gets a visible upper edge; the opening and the collision hull stay clear.
    const shelterTrim = material(arena.accent);
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      this.group.add(box(5.2, .12, 1.35, shelterTrim, side * 25, 2.34, end * 11));
      this.group.add(box(.16, .8, .16, dark, side * 27.5, 2.7, end * 13.1));
    }
    // Painted route arrows make the downhill cover approaches legible at speed.
    for (const ramp of getArenaRamps(arena)) {
      const tip = box(.17, .015, 1.15, line, ramp.x, .035, Math.min(ramp.z + ramp.d / 2 + 1.5, 28));
      tip.rotation.y = ramp.x < 0 ? -.48 : .48;
      this.group.add(tip);
    }
    // Original city silhouettes sit beyond the fence and never alter combat collision.
    // Their simple primitives merge into the existing static material batches.
    const facade = material(arena.id === 'afterglow-heights' ? '#707a89' : '#607b80');
    const landmarkBright = material(arena.accent);
    if (arena.landmark === 'plaza-arcade') {
      // A shaded neighborhood arcade frames the far end of the skate plaza.
      this.group.add(box(22, .5, 5, facade, 0, 6.6, -39));
      for (const x of [-10, -5, 0, 5, 10]) this.group.add(box(.55, 6.4, .55, facade, x, 3.2, -37));
      for (const x of [-7.5, -2.5, 2.5, 7.5]) this.group.add(box(3.6, .16, .12, landmarkBright, x, 5.9, -36.65));
    } else if (arena.landmark === 'lagoon-terminal') {
      // A low waterfront terminal and one tall marker remain clear of the dock cranes.
      this.group.add(box(20, 4.2, 5, facade, 0, 2.1, -40));
      this.group.add(box(23, .5, 6, landmarkBright, 0, 4.5, -40));
      this.group.add(box(1.1, 11, 1.1, facade, 10, 5.5, -39));
      this.group.add(box(3.3, .7, 3.3, landmarkBright, 10, 11.3, -39));
    } else if (arena.landmark === 'roof-water-tower') {
      // Roof tanks are a familiar city silhouette, held above the playable roof line.
      this.group.add(box(19, 4, 6, facade, 0, 1, -40));
      for (const x of [-3, 3]) this.group.add(box(.3, 5.5, .3, facade, x, 5.7, -39));
      this.group.add(cylinder(3.7, 3.5, facade, 0, 10, -39));
      this.group.add(cylinder(3.8, .18, landmarkBright, 0, 11.8, -39));
    } else {
      // A transit-depot clock tower gives the long industrial lane a fixed bearing.
      this.group.add(box(8, 13, 5, facade, 0, 6.5, -40));
      this.group.add(box(10, .5, 6, landmarkBright, 0, 13.25, -40));
      const clock = new THREE.Mesh(new THREE.CircleGeometry(1.35, 16), landmarkBright);
      clock.position.set(0, 10.3, -37.44); clock.castShadow = false; this.group.add(clock);
      this.group.add(box(.1, .85, .08, dark, 0, 10.6, -37.37));
    }
    // Open mesh fence stays beyond the playable boundary.
    for (let k = -30; k <= 30; k += 5) for (const edge of [-31, 31]) {
      this.group.add(cylinder(.065, 2.4, dark, k, 1.2, edge), cylinder(.065, 2.4, dark, edge, 1.2, k));
    }
    for (const edge of [-31, 31]) for (const h of [.4, 1.2, 2.35]) {
      this.group.add(box(62, .035, .035, dark, 0, h, edge), box(.035, .035, 62, dark, edge, h, 0));
    }
    arena.props.forEach(prop => {
      const group = new THREE.Group(); group.position.set(prop.x, 0, prop.z); group.rotation.y = prop.rotation ?? 0;
      const tint = material(prop.color ?? arena.accent);
      // Most props are thin dressing; tanks/crates remain small enough to read as scenery.
      if (prop.kind === 'lamp') {
        group.add(cylinder(.075, 5, dark, 0, 2.5), box(1.1, .16, .45, light, .4, 5, 0));
        group.add(box(.9, .035, .3, new THREE.MeshStandardMaterial({ color: '#fff4c9', emissive: '#fff0b0', emissiveIntensity: .5 }), .4, 4.9, 0));
      } else if (prop.kind === 'tree') {
        group.add(cylinder(.12, 2.2, material('#7a6750'), 0, 1.1));
        for (let i = 0; i < 3; i++) { const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.85 - i * .1, 1), material('#6e9980')); crown.position.set(i % 2 * .35, 2 + i * .5, 0); crown.castShadow = true; group.add(crown); }
      } else if (prop.kind === 'tank') {
        group.add(cylinder(.48, 1.5, tint, 0, .75), cylinder(.52, .1, dark, 0, .12), cylinder(.52, .1, dark, 0, 1.4));
      } else if (prop.kind === 'crate') {
        group.add(box(.8, .8, .8, tint, 0, .4), box(.83, .1, .83, dark, 0, .15), box(.83, .1, .83, dark, 0, .65));
      } else if (prop.kind === 'rail') {
        group.add(box(2.4, .08, .08, dark, 0, .75), cylinder(.045, .75, dark, -1, .375), cylinder(.045, .75, dark, 1, .375));
      } else {
        const texture = canvasTexture(ctx => {
          ctx.fillStyle = '#25383c'; ctx.fillRect(0, 0, 512, 256);
          ctx.fillStyle = arena.accent; ctx.fillRect(18, 18, 10, 220);
          ctx.font = '900 42px "Barlow Condensed", sans-serif'; ctx.fillText(arena.name.toUpperCase().split(' ')[0], 48, 100);
          ctx.fillStyle = '#f5f1e1'; ctx.font = '800 35px "Barlow Condensed", sans-serif'; ctx.fillText(arena.name.toUpperCase().split(' ').slice(1).join(' '), 48, 152);
          ctx.font = '600 15px "Barlow Condensed", sans-serif'; ctx.fillText('COLOUR THE CITY / MAKE YOUR MARK', 48, 210);
        });
        group.add(cylinder(.07, 3, dark, -1.5, 1.5), cylinder(.07, 3, dark, 1.5, 1.5));
        group.add(box(4.8, 2.4, .15, dark, 0, 3));
        const face = new THREE.Mesh(new THREE.PlaneGeometry(4.65, 2.25), new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide })); face.position.set(0, 3, .085); group.add(face);
      }
      this.group.add(group);
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), material(arena.id === 'afterglow-heights' ? '#9a9eb7' : '#6caaa9', .3));
    water.rotation.x = -Math.PI / 2; water.position.y = -1.4; this.group.add(water);
    const skyline = material(arena.id === 'afterglow-heights' ? '#88879e' : '#91a9a7');
    for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI * 2 / 32, radius = 77 + i % 4 * 9, height = 5 + i * 7 % 19;
      this.group.add(box(5 + i % 3 * 3, height, 5 + i % 4 * 2, skyline, Math.cos(angle) * radius, height / 2 - 1, Math.sin(angle) * radius));
    }
    this.batchStaticGeometry();
  }
  private batchStaticGeometry() {
    type Batch = { material: THREE.MeshStandardMaterial; meshes: THREE.Mesh[]; geometry: THREE.BufferGeometry[]; cast: boolean; receive: boolean };
    const batches = new Map<string, Batch>();
    this.group.updateMatrixWorld(true);
    const inverse = this.group.matrixWorld.clone().invert();
    this.group.traverse(object => {
      // Keep the floor reference and transparent ink plane independent. Their textures stay live.
      if (!(object instanceof THREE.Mesh) || object === this.ground || !(object.material instanceof THREE.MeshStandardMaterial) || object.material.transparent) return;
      const mat = object.material;
      const signature = JSON.stringify([mat.color.getHex(), mat.roughness, mat.metalness, mat.map?.uuid, mat.transparent, mat.opacity, mat.emissive.getHex(), mat.emissiveIntensity, mat.side, mat.depthWrite, mat.depthTest, mat.polygonOffset, mat.polygonOffsetFactor]);
      let batch = batches.get(signature);
      if (!batch) { batch = { material: mat, meshes: [], geometry: [], cast: false, receive: false }; batches.set(signature, batch); }
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      // All procedural primitives use position, normal and UV. Groups are unnecessary after batching.
      geometry.clearGroups();
      batch.geometry.push(geometry); batch.meshes.push(object);
      batch.cast ||= object.castShadow; batch.receive ||= object.receiveShadow;
    });
    const retiredGeometry = new Set<THREE.BufferGeometry>();
    const retiredMaterials = new Set<THREE.Material>();
    const retainedMaterials = new Set<THREE.Material>();
    for (const batch of batches.values()) {
      const geometry = mergeGeometries(batch.geometry, false);
      batch.geometry.forEach(g => g.dispose());
      if (!geometry) continue;
      const merged = new THREE.Mesh(geometry, batch.material);
      merged.castShadow = batch.cast; merged.receiveShadow = batch.receive;
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      retainedMaterials.add(batch.material);
      batch.meshes.forEach(mesh => {
        retiredGeometry.add(mesh.geometry);
        if (!Array.isArray(mesh.material)) retiredMaterials.add(mesh.material);
        mesh.removeFromParent();
      });
      this.group.add(merged);
    }
    // A material can be shared by several original meshes; dispose each removed resource once.
    this.group.traverse(object => {
      if (object instanceof THREE.Mesh) for (const mat of Array.isArray(object.material) ? object.material : [object.material]) retainedMaterials.add(mat);
    });
    retiredGeometry.forEach(g => g.dispose());
    retiredMaterials.forEach(m => { if (!retainedMaterials.has(m)) m.dispose(); });
  }
  updateInk(cells: Uint8Array, resolution: number) {
    const ctx = this.paintCanvas.getContext('2d')!;
    const size = this.paintCanvas.width / resolution;
    ctx.clearRect(0, 0, this.paintCanvas.width, this.paintCanvas.height);
    for (let z = 0; z < resolution; z++) for (let x = 0; x < resolution; x++) {
      const owner = cells[z * resolution + x]; if (!owner) continue;
      ctx.fillStyle = owner === 1 ? '#20ddcf' : '#ff595e';
      const seed = (x * 73 + z * 151) % 17;
      ctx.beginPath(); ctx.ellipse((x + .5) * size, (z + .5) * size, size * (.68 + seed * .006), size * (.67 + seed * .004), seed, 0, Math.PI * 2); ctx.fill();
      if (seed % 3 === 0) { ctx.beginPath(); ctx.arc((x + .1) * size, (z + .15) * size, size * .2, 0, Math.PI * 2); ctx.fill(); }
    }
    this.paintTexture.needsUpdate = true;
  }
  dispose() {
    const textures = new Set<THREE.Texture>(); const materials = new Set<THREE.Material>(); const geometries = new Set<THREE.BufferGeometry>();
    this.group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(mat); for (const value of Object.values(mat)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    textures.add(this.paintTexture); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
    this.group.clear();
  }
}

export { createAvatar } from './character';
