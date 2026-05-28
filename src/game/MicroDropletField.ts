import { GAME_CONFIG } from './constants';
import { MicroDropletData } from './types';

/**
 * Manages the field of static micro-droplets sitting on the glass. The
 * camera scrolls downward through this field; droplets above the camera
 * are recycled to seed new ones below the visible area, so the field is
 * effectively infinite.
 */
export class MicroDropletField {
  private droplets: MicroDropletData[] = [];
  private worldWidth: number;
  // Lowest y we've seeded down to (world coords; +y = down).
  private seededTo = 0;

  constructor(worldWidth: number) {
    this.worldWidth = worldWidth;
  }

  /** Seed enough droplets to cover an initial vertical span. */
  seedInitial(initialHeight: number): void {
    this.fillDownTo(initialHeight * 2);
  }

  /** Ensure droplets exist down to `targetY`. Recycle ones above `cullY`. */
  update(targetY: number, cullY: number): void {
    if (targetY > this.seededTo) {
      this.fillDownTo(targetY);
    }
    // Recycle out-of-view droplets above the camera into the unseeded band.
    for (const d of this.droplets) {
      if (d.alive && d.pos.y < cullY) {
        d.alive = false;
      }
    }
  }

  getDroplets(): MicroDropletData[] {
    return this.droplets;
  }

  /**
   * Find any droplet that overlaps the given circle. Returns it and marks it
   * absorbed in one call to keep the hot loop tight.
   */
  consumeOverlapping(cx: number, cy: number, r: number): MicroDropletData | null {
    for (const d of this.droplets) {
      if (!d.alive) continue;
      const dx = d.pos.x - cx;
      const dy = d.pos.y - cy;
      const rr = d.radius + r;
      if (dx * dx + dy * dy <= rr * rr) {
        d.alive = false;
        return d;
      }
    }
    return null;
  }

  /**
   * Returns true if the given point is on already-cleaned glass (i.e. there
   * are no droplets nearby). Used to give the main drop reduced friction
   * when sliding on its own trail. Cheap heuristic, no spatial index needed.
   */
  isPointOnDryGlass(cx: number, cy: number, range: number): boolean {
    let count = 0;
    for (const d of this.droplets) {
      if (!d.alive) continue;
      const dx = d.pos.x - cx;
      const dy = d.pos.y - cy;
      if (dx * dx + dy * dy <= range * range) {
        count++;
        if (count >= 2) return true;
      }
    }
    return false;
  }

  private fillDownTo(targetY: number): void {
    const fromY = this.seededTo;
    const toY = targetY;
    const bandHeight = toY - fromY;
    if (bandHeight <= 0) return;

    const count = Math.floor(bandHeight * this.worldWidth * GAME_CONFIG.MICRO_DROPLET_DENSITY);

    // Reuse dead slots first.
    let reused = 0;
    for (const d of this.droplets) {
      if (reused >= count) break;
      if (!d.alive) {
        d.pos.x = Math.random() * this.worldWidth;
        d.pos.y = fromY + Math.random() * bandHeight;
        d.radius =
          GAME_CONFIG.MICRO_DROPLET_MIN_R +
          Math.random() * (GAME_CONFIG.MICRO_DROPLET_MAX_R - GAME_CONFIG.MICRO_DROPLET_MIN_R);
        d.alive = true;
        reused++;
      }
    }

    // Append new ones for the rest.
    for (let i = reused; i < count; i++) {
      this.droplets.push({
        pos: { x: Math.random() * this.worldWidth, y: fromY + Math.random() * bandHeight },
        radius:
          GAME_CONFIG.MICRO_DROPLET_MIN_R +
          Math.random() * (GAME_CONFIG.MICRO_DROPLET_MAX_R - GAME_CONFIG.MICRO_DROPLET_MIN_R),
        alive: true,
      });
    }

    this.seededTo = toY;
  }
}
