export type ArenaBlock = { x: number; z: number; w: number; d: number; h: number; color?: string; y?: number };
export type ArenaProp = { kind: 'rail' | 'lamp' | 'sign' | 'tank' | 'tree' | 'crate'; x: number; z: number; rotation?: number; color?: string };
export type ArenaDefinition = {
  id: string; name: string; subtitle: string; description: string;
  accent: string; sky: string; ground: string;
  spawn: [number, number]; botSpawns: [number, number][];
  obstacles: ArenaBlock[]; props: ArenaProp[];
};

export type ArenaRamp = { x: number; z: number; w: number; d: number; h: number };

/** Paired walls form shallow shelters with a clear opening toward the middle lane. */
export function getArenaShelters(arena: ArenaDefinition): ArenaBlock[] {
  const tint = arena.id === 'freight-frequency' ? '#536b72' : arena.id === 'afterglow-heights' ? '#77758c' : arena.id === 'relay-works' ? '#627870' : '#8b918b';
  return [-1, 1].flatMap(side => [-1, 1].flatMap(end => [
    {x:side * 25,z:end * 11,w:5,d:1.2,h:2.25,color:tint},
    {x:side * 27.5,z:end * 13.1,w:1.2,d:3.6,h:2.25,color:tint},
  ]));
}

/** Ramps approach the two front cover islands from +Z; z is the wedge center. */
export function getArenaRamps(arena: ArenaDefinition): ArenaRamp[] {
  return arena.obstacles.slice(0, 2).flatMap(block => {
    const front = block.z + block.d / 2;
    const depth = Math.min(block.h * 3.5, 29 - front);
    if ((block.y ?? 0) !== 0 || block.h <= 0 || depth < block.h) return [];
    return [{ x: block.x, z: front + depth / 2, w: Math.min(block.w, 4.5), d: depth, h: block.h }];
  });
}

/** Shared local hull vertices keep visual and collision geometry exactly aligned. */
export function getRampVertices(ramp: ArenaRamp): Float32Array {
  const x = ramp.w / 2, z = ramp.d / 2;
  return new Float32Array([-x, 0, -z, x, 0, -z, -x, 0, z, x, 0, z, -x, ramp.h, -z, x, ramp.h, -z]);
}

export const ARENAS: ArenaDefinition[] = [
  {
    id: 'kickflip-court', name: 'Kickflip Court', subtitle: 'SUNLIT SKATE PLAZA',
    description: 'Carve through concrete islands and take the open centre in a sunwashed skate plaza.',
    accent: '#d9ff43', sky: '#a8d9e0', ground: '#b9b6a8',
    spawn: [0, 24], botSpawns: [[-20, -23], [0, -24], [20, -23]],
    obstacles: [
      { x: -18, z: 15, w: 9, d: 4, h: 1.2 }, { x: 18, z: 15, w: 9, d: 4, h: 1.2 },
      { x: -10, z: 8, w: 5, d: 8, h: 1.5 }, { x: 10, z: 8, w: 5, d: 8, h: 1.5 },
      { x: -21, z: 0, w: 5, d: 11, h: 2.2 }, { x: 21, z: 0, w: 5, d: 11, h: 2.2 },
      { x: -8, z: -5, w: 7, d: 3, h: 1.1 }, { x: 8, z: -5, w: 7, d: 3, h: 1.1 },
      { x: 0, z: 0, w: 4, d: 4, h: 2.6, color: '#e4e3d5' },
      { x: -15, z: -15, w: 10, d: 4, h: 1.6 }, { x: 15, z: -15, w: 10, d: 4, h: 1.6 },
      { x: -27, z: 21, w: 2, d: 8, h: 2.8 }, { x: 27, z: 21, w: 2, d: 8, h: 2.8 },
      { x: -27, z: -20, w: 2, d: 8, h: 2.8 }, { x: 27, z: -20, w: 2, d: 8, h: 2.8 },
      { x: 0, z: -14, w: 4, d: 3, h: 0.7 },
    ],
    props: [
      { kind: 'rail', x: -7, z: 17 }, { kind: 'rail', x: 7, z: -19 },
      { kind: 'lamp', x: -26, z: 10 }, { kind: 'lamp', x: 26, z: -10 },
      { kind: 'sign', x: 0, z: -28, color: '#d9ff43' },
      { kind: 'tree', x: -26, z: -8 }, { kind: 'tree', x: 26, z: 8 },
    ],
  },
  {
    id: 'freight-frequency', name: 'Freight Frequency', subtitle: 'DOCKSIDE CONTAINER YARD',
    description: 'Cut between stacked freight, wide cross lanes, and bright harbour-side cover.',
    accent: '#ff9b55', sky: '#b7c9d5', ground: '#6b7e86',
    spawn: [0, 24], botSpawns: [[-22, -24], [0, -24], [22, -24]],
    obstacles: [
      { x: -17, z: 16, w: 12, d: 5, h: 3, color: '#df784e' },
      { x: 17, z: 16, w: 12, d: 5, h: 3, color: '#458d9b' },
      { x: -18, z: 3, w: 5, d: 13, h: 3.3, color: '#458d9b' },
      { x: 18, z: 3, w: 5, d: 13, h: 3.3, color: '#df784e' },
      { x: -6, z: 7, w: 4, d: 5, h: 1.4 }, { x: 6, z: 7, w: 4, d: 5, h: 1.4 },
      { x: 0, z: -2, w: 10, d: 4, h: 2.2, color: '#d1bb68' },
      { x: -12, z: -11, w: 5, d: 10, h: 3, color: '#d1bb68' },
      { x: 12, z: -11, w: 5, d: 10, h: 3, color: '#65958b' },
      { x: -23, z: -16, w: 5, d: 4, h: 1.5 }, { x: 23, z: -16, w: 5, d: 4, h: 1.5 },
      { x: 0, z: -17, w: 5, d: 3, h: 1.2 },
      { x: -27, z: 5, w: 2, d: 7, h: 2 }, { x: 27, z: 5, w: 2, d: 7, h: 2 },
      { x: -7, z: 20, w: 2, d: 2, h: 1.1 }, { x: 7, z: 20, w: 2, d: 2, h: 1.1 },
    ],
    props: [
      { kind: 'tank', x: -26, z: -4, color: '#f1c267' }, { kind: 'tank', x: 26, z: -4 },
      { kind: 'lamp', x: -26, z: 24 }, { kind: 'lamp', x: 26, z: -25 },
      { kind: 'sign', x: 0, z: -28, color: '#ff9b55' },
      { kind: 'crate', x: -24, z: 12 }, { kind: 'crate', x: 24, z: 12 },
    ],
  },
  {
    id: 'afterglow-heights', name: 'Afterglow Heights', subtitle: 'CITY ROOFTOP GARDEN',
    description: 'Race between garden terraces and rooftop machinery above the evening skyline.',
    accent: '#e8a3ff', sky: '#b7a8cf', ground: '#9695a6',
    spawn: [0, 24], botSpawns: [[-22, -24], [0, -24], [22, -24]],
    obstacles: [
      { x: -17, z: 16, w: 10, d: 4, h: 1.5, color: '#cfb6a6' },
      { x: 17, z: 16, w: 10, d: 4, h: 1.5, color: '#cfb6a6' },
      { x: -9, z: 7, w: 5, d: 7, h: 2.3, color: '#747f93' },
      { x: 9, z: 7, w: 5, d: 7, h: 2.3, color: '#747f93' },
      { x: -23, z: 2, w: 4, d: 9, h: 1.1, color: '#c6b3a7' },
      { x: 23, z: 2, w: 4, d: 9, h: 1.1, color: '#c6b3a7' },
      { x: 0, z: -2, w: 5, d: 5, h: 1.3, color: '#d8cdc1' },
      { x: -12, z: -9, w: 8, d: 4, h: 1.8 }, { x: 12, z: -9, w: 8, d: 4, h: 1.8 },
      { x: -19, z: -18, w: 6, d: 4, h: 2.7, color: '#747f93' },
      { x: 19, z: -18, w: 6, d: 4, h: 2.7, color: '#747f93' },
      { x: -5, z: -18, w: 3, d: 3, h: 1 }, { x: 5, z: -18, w: 3, d: 3, h: 1 },
      { x: -28, z: 20, w: 1.5, d: 10, h: 1.2 }, { x: 28, z: 20, w: 1.5, d: 10, h: 1.2 },
      { x: 0, z: 13, w: 3, d: 2, h: 0.65 },
    ],
    props: [
      { kind: 'tree', x: -26, z: 11 }, { kind: 'tree', x: 26, z: 11 },
      { kind: 'tree', x: -26, z: -12 }, { kind: 'tree', x: 26, z: -12 },
      { kind: 'lamp', x: -26, z: 25 }, { kind: 'lamp', x: 26, z: 25 },
      { kind: 'sign', x: 0, z: -28, color: '#e8a3ff' },
      { kind: 'rail', x: -10, z: -25 }, { kind: 'rail', x: 10, z: -25 },
    ],
  },
  {
    id: 'relay-works', name: 'Relay Works', subtitle: 'CONVERTED INDUSTRIAL HALL',
    description: 'Trade paint across machine islands, storage bays, and an exposed central corridor.',
    accent: '#63e8da', sky: '#a7bdc1', ground: '#82908b',
    spawn: [0, 24], botSpawns: [[-22, -24], [0, -24], [22, -24]],
    obstacles: [
      { x: -17, z: 17, w: 9, d: 4, h: 2.4, color: '#667f78' },
      { x: 17, z: 17, w: 9, d: 4, h: 2.4, color: '#667f78' },
      { x: -11, z: 5, w: 6, d: 10, h: 2.8, color: '#c2ae7b' },
      { x: 11, z: 5, w: 6, d: 10, h: 2.8, color: '#c2ae7b' },
      { x: -24, z: 3, w: 3, d: 8, h: 1.5 }, { x: 24, z: 3, w: 3, d: 8, h: 1.5 },
      { x: -5, z: -7, w: 4, d: 4, h: 1.3 }, { x: 5, z: -7, w: 4, d: 4, h: 1.3 },
      { x: -18, z: -12, w: 7, d: 5, h: 3, color: '#667f78' },
      { x: 18, z: -12, w: 7, d: 5, h: 3, color: '#667f78' },
      { x: 0, z: -17, w: 8, d: 3, h: 1.7, color: '#c2ae7b' },
      { x: -27, z: 22, w: 2, d: 5, h: 4 }, { x: 27, z: 22, w: 2, d: 5, h: 4 },
      { x: -27, z: -23, w: 2, d: 5, h: 4 }, { x: 27, z: -23, w: 2, d: 5, h: 4 },
      { x: 0, z: 11, w: 3, d: 3, h: 0.8 },
      { x: -9, z: -23, w: 3, d: 2, h: 1 }, { x: 9, z: -23, w: 3, d: 2, h: 1 },
    ],
    props: [
      { kind: 'tank', x: -25, z: -5, color: '#b3d4c5' }, { kind: 'tank', x: 25, z: -5, color: '#b3d4c5' },
      { kind: 'lamp', x: -25, z: 12 }, { kind: 'lamp', x: 25, z: 12 },
      { kind: 'sign', x: 0, z: -28, color: '#63e8da' },
      { kind: 'crate', x: -23, z: -19 }, { kind: 'crate', x: 23, z: -19 },
    ],
  },
];

// Keep shelters in the same obstacle list used by rendering, Rapier and AI routing.
for (const arena of ARENAS) arena.obstacles.push(...getArenaShelters(arena));
