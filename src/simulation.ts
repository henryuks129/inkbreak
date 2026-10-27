export type Team = 0 | 1 | 2;
export type InkTeam = 1 | 2;

/** Authoritative square turf grid, centered on world origin. */
export class InkField {
  readonly cells: Uint8Array;
  revision = 0;
  private counts = [0, 0, 0];

  constructor(readonly worldSize = 64, readonly resolution = 64) {
    if (!Number.isFinite(worldSize) || worldSize <= 0 || !Number.isInteger(resolution) || resolution < 1) {
      throw new RangeError('InkField requires a positive world size and integer resolution.');
    }
    this.cells = new Uint8Array(resolution * resolution);
    this.counts[0] = this.cells.length;
  }

  at(x: number, z: number): Team {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
    const half = this.worldSize / 2;
    if (x < -half || x >= half || z < -half || z >= half) return 0;
    const col = Math.floor((x + half) / this.worldSize * this.resolution);
    const row = Math.floor((z + half) / this.worldSize * this.resolution);
    return this.cells[row * this.resolution + col] as Team;
  }

  /** Paint cells whose centers fall inside the world-space disc. Returns changed cells. */
  paint(x: number, z: number, radius: number, team: InkTeam): number {
    if (![x, z, radius].every(Number.isFinite) || radius <= 0 || (team !== 1 && team !== 2)) return 0;
    const size = this.worldSize / this.resolution;
    const half = this.worldSize / 2;
    const loX = Math.max(0, Math.ceil((x - radius + half) / size - 0.5));
    const hiX = Math.min(this.resolution - 1, Math.floor((x + radius + half) / size - 0.5));
    const loZ = Math.max(0, Math.ceil((z - radius + half) / size - 0.5));
    const hiZ = Math.min(this.resolution - 1, Math.floor((z + radius + half) / size - 0.5));
    let changed = 0;
    for (let row = loZ; row <= hiZ; row++) {
      const dz = (row + 0.5) * size - half - z;
      for (let col = loX; col <= hiX; col++) {
        const dx = (col + 0.5) * size - half - x;
        if (dx * dx + dz * dz > radius * radius) continue;
        const index = row * this.resolution + col;
        const previous = this.cells[index];
        if (previous === team) continue;
        this.cells[index] = team;
        this.counts[previous]--;
        this.counts[team]++;
        changed++;
      }
    }
    if (changed) this.revision++;
    return changed;
  }

  coverage() {
    return { cyan: this.counts[1], coral: this.counts[2], neutral: this.counts[0], total: this.cells.length };
  }

  reset(): void {
    this.cells.fill(0);
    this.counts = [this.cells.length, 0, 0];
    this.revision++;
  }
}

export class RoundRules {
  remaining: number;
  active = true;
  splats = 0;

  constructor(readonly duration = 180) {
    if (!Number.isFinite(duration) || duration <= 0) throw new RangeError('Round duration must be positive.');
    this.remaining = duration;
  }

  get finished(): boolean { return this.remaining <= 0; }

  tick(dt: number): void {
    if (!this.active || !Number.isFinite(dt) || dt <= 0) return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.finished) this.active = false;
  }

  addSplat(): void { if (this.active && !this.finished) this.splats++; }

  reset(): void {
    this.remaining = this.duration;
    this.active = true;
    this.splats = 0;
  }
}

export function getInkSpeed(surface: Team, swimming: boolean, playerTeam: InkTeam = 1): number {
  if (surface !== 0 && surface !== playerTeam) return 0.55;
  return swimming && surface === playerTeam ? 1.85 : 1;
}

/** Friendly swimming refills a full tank in about 2.3 seconds; idle refill takes about 8 seconds. */
export function updateInk(ink: number, dt: number, swimming: boolean, onFriendlyInk: boolean, firing: boolean): number {
  const current = Number.isFinite(ink) ? Math.min(100, Math.max(0, ink)) : 0;
  if (!Number.isFinite(dt) || dt <= 0) return current;
  const rate = firing && !swimming ? -12 : swimming && onFriendlyInk ? 44 : 12;
  return Math.min(100, Math.max(0, current + rate * dt));
}
