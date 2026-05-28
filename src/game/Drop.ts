import { Vec2 } from './types';
import { GAME_CONFIG } from './constants';

/**
 * The main droplet. Tracks position, velocity and radius. The renderer
 * reads these values each frame to draw a soft circle into the metaball
 * container.
 */
export class Drop {
  pos: Vec2;
  vel: Vec2 = { x: 0, y: 0 };
  radius: number;
  // Cosmetic squash/stretch driven by velocity, applied at render time.
  stretchX = 1;
  stretchY = 1;

  constructor(x: number, y: number, radius: number) {
    this.pos = { x, y };
    this.radius = radius;
  }

  get mass(): number {
    return Math.PI * this.radius * this.radius;
  }

  /** Adds the area of a smaller droplet, returns the new radius. */
  absorb(otherRadius: number): number {
    const newArea = this.mass + Math.PI * otherRadius * otherRadius * GAME_CONFIG.ABSORPTION_GAIN;
    this.radius = Math.min(GAME_CONFIG.DROP_MAX_RADIUS, Math.sqrt(newArea / Math.PI));
    return this.radius;
  }

  update(dt: number, horizontalForce: number, onTrail: boolean): void {
    // Gravity scales with size: bigger drops fall faster.
    const sizeFactor = Math.max(0, this.radius - GAME_CONFIG.DROP_MIN_RADIUS);
    const gravity = GAME_CONFIG.GRAVITY_BASE + GAME_CONFIG.GRAVITY_PER_RADIUS * sizeFactor;

    // Horizontal acceleration from input. Effect is dampened by mass.
    const massDamp = Math.max(0.4, GAME_CONFIG.DROP_INITIAL_RADIUS / this.radius);
    this.vel.x += horizontalForce * 600 * dt * massDamp;
    this.vel.y += gravity * dt;

    // Friction — less on a wet trail, more on dry glass.
    const friction = onTrail
      ? GAME_CONFIG.FRICTION_TRAIL_BOOST
      : GAME_CONFIG.FRICTION_BASE * (this.radius < GAME_CONFIG.DROP_INITIAL_RADIUS * 1.2 ? GAME_CONFIG.FRICTION_DRY_PENALTY : 1);

    const frictionPerFrame = Math.pow(friction, dt * 60);
    this.vel.x *= frictionPerFrame;
    this.vel.y *= frictionPerFrame;

    // Clamp.
    const speed = Math.hypot(this.vel.x, this.vel.y);
    if (speed > GAME_CONFIG.MAX_VELOCITY) {
      const s = GAME_CONFIG.MAX_VELOCITY / speed;
      this.vel.x *= s;
      this.vel.y *= s;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    // Squash/stretch from velocity: longer in direction of travel.
    const targetStretchY = 1 + Math.min(0.4, this.vel.y / 800);
    const targetStretchX = 1 + Math.min(0.15, Math.abs(this.vel.x) / 1200);
    this.stretchY = this.stretchY + (targetStretchY - this.stretchY) * Math.min(1, dt * 6);
    this.stretchX = this.stretchX + (targetStretchX - this.stretchX) * Math.min(1, dt * 6);
  }

  containsPoint(x: number, y: number): boolean {
    const dx = x - this.pos.x;
    const dy = y - this.pos.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  overlaps(x: number, y: number, r: number): boolean {
    const dx = x - this.pos.x;
    const dy = y - this.pos.y;
    const rr = this.radius + r;
    return dx * dx + dy * dy <= rr * rr;
  }
}
