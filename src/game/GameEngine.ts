import {
  Application,
  Container,
  Graphics,
  Sprite,
  BlurFilter,
  ColorMatrixFilter,
  TilingSprite,
} from 'pixi.js';
import { Drop } from './Drop';
import { MicroDropletField } from './MicroDropletField';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';
import { loadAssets, LoadedAssets } from './AssetLoader';
import { GAME_CONFIG, COLORS } from './constants';
import { GameStats } from './types';

export interface GameEngineCallbacks {
  onStatsUpdate?: (stats: GameStats) => void;
  onPhaseChange?: (phase: 'playing' | 'paused' | 'ended') => void;
}

/**
 * The orchestrator. Owns the PixiJS Application, the game state, and the
 * main loop. React just mounts/unmounts it and reads stats via callbacks.
 *
 * Coordinate model
 * ----------------
 * The world is `WORLD_WIDTH` wide and infinitely tall. The camera scrolls
 * downward at `cameraY`. Everything is positioned in world coordinates
 * inside `worldContainer`, which we shift by `-cameraY`. The renderer
 * scales the whole stage to fit the viewport.
 *
 * Layers (bottom → top)
 * ---------------------
 *  - bgLayer       : tiled background (the foggy window)
 *  - trailLayer    : translucent "cleaned glass" trails left by the drop
 *  - microLayer    : small static droplets (with metaball filter shared with main drop)
 *  - dropLayer     : the main droplet (shares the metaball filter)
 *  - highlightLayer: speculars / rim lighting drawn ON TOP, no metaball filter
 */
export class GameEngine {
  private app!: Application;
  private host: HTMLElement;
  private resizeObs: ResizeObserver | null = null;

  // Layers
  private worldContainer!: Container;
  private bgLayer!: Container;
  private bgSprite: Sprite | TilingSprite | null = null;
  private trailLayer!: Container;
  private metaballLayer!: Container; // contains both micro + main drop
  private microGfx!: Graphics;
  private dropGfx!: Graphics;
  private highlightGfx!: Graphics;
  private highlightLayer!: Container;

  // State
  private drop!: Drop;
  private field!: MicroDropletField;
  private cameraY = 0;
  private worldHeight = 0; // current viewport height in world units
  private worldWidth = GAME_CONFIG.WORLD_WIDTH;

  // Trail segments: array of {x, y, r, age} in world space, fade over time.
  private trail: { x: number; y: number; r: number; age: number }[] = [];

  // Input/audio
  private input!: InputManager;
  private audio: AudioManager;
  private loadedAssets: LoadedAssets = { background: null, dropHighlight: null };

  // Stats
  private stats: GameStats = { size: 0, absorbed: 0, cleanedPct: 0, chain: 0 };
  private cleanedPxRunning = 0;
  private chainCount = 0;
  private chainResetAt = 0;

  // Lifecycle
  private running = false;
  private rafId = 0;
  private lastT = 0;
  private callbacks: GameEngineCallbacks;

  constructor(host: HTMLElement, callbacks: GameEngineCallbacks = {}) {
    this.host = host;
    this.callbacks = callbacks;
    this.audio = new AudioManager();
  }

  async init(): Promise<void> {
    // Pixi v8 init.
    this.app = new Application();
    await this.app.init({
      resizeTo: this.host,
      backgroundColor: COLORS.BG_FALLBACK_BOTTOM,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: 'webgl',
    });
    this.host.appendChild(this.app.canvas);

    // Load assets (background, etc.) with graceful fallback.
    this.loadedAssets = await loadAssets();

    // Audio init (decoders, etc.). Unlock happens on first user gesture.
    await this.audio.init();

    this.buildScene();

    // Reactive resize.
    this.resizeObs = new ResizeObserver(() => this.handleResize());
    this.resizeObs.observe(this.host);
    this.handleResize();

    // Input.
    this.input = new InputManager(this.host);
    this.input.start();
  }

  start(): void {
    if (this.running) return;
    this.audio.unlock().then(() => this.audio.startAmbient());
    this.running = true;
    this.lastT = performance.now();
    this.callbacks.onPhaseChange?.('playing');
    this.loop();
  }

  pause(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.callbacks.onPhaseChange?.('paused');
  }

  resume(): void {
    if (this.running) return;
    this.lastT = performance.now();
    this.running = true;
    this.callbacks.onPhaseChange?.('playing');
    this.loop();
  }

  setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.input?.stop();
    this.audio.destroy();
    this.resizeObs?.disconnect();
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
    }
  }

  /** Optional: call this from a user gesture handler if you want to enable gyro on iOS. */
  async enableGyro(): Promise<boolean> {
    return this.input.tryEnableGyro();
  }

  // ---------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------

  private buildScene(): void {
    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);

    // Background.
    this.bgLayer = new Container();
    this.worldContainer.addChild(this.bgLayer);
    this.buildBackground();

    // Trail layer.
    this.trailLayer = new Container();
    this.trailLayer.alpha = 0.18;
    this.worldContainer.addChild(this.trailLayer);

    // Metaball layer.
    this.metaballLayer = new Container();
    this.microGfx = new Graphics();
    this.dropGfx = new Graphics();
    this.metaballLayer.addChild(this.microGfx);
    this.metaballLayer.addChild(this.dropGfx);

    // The metaball trick: a strong blur, then a color matrix that crushes
    // the alpha into a hard edge. Adjacent circles merge into fluid blobs.
    const blur = new BlurFilter({ strength: GAME_CONFIG.METABALL_BLUR, quality: 4 });
    const threshold = new ColorMatrixFilter();
    // Multiply alpha by METABALL_THRESHOLD and offset, clamped 0..1 by GPU.
    threshold.matrix = [
      1, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, GAME_CONFIG.METABALL_THRESHOLD, GAME_CONFIG.METABALL_OFFSET / 255,
    ];
    this.metaballLayer.filters = [blur, threshold];
    this.worldContainer.addChild(this.metaballLayer);

    // Highlight overlay (NOT inside metaball filter, so it stays crisp).
    this.highlightLayer = new Container();
    this.highlightGfx = new Graphics();
    this.highlightLayer.addChild(this.highlightGfx);
    this.worldContainer.addChild(this.highlightLayer);

    // Initialize drop and field. Field width is filled in resize().
    this.drop = new Drop(this.worldWidth / 2, 60, GAME_CONFIG.DROP_INITIAL_RADIUS);
    this.field = new MicroDropletField(this.worldWidth);
  }

  private buildBackground(): void {
    if (this.bgSprite) {
      this.bgLayer.removeChild(this.bgSprite);
      this.bgSprite = null;
    }
    if (this.loadedAssets.background) {
      // Tile vertically so scroll is seamless.
      const tex = this.loadedAssets.background;
      const tiling = new TilingSprite({ texture: tex, width: this.worldWidth, height: 2000 });
      this.bgLayer.addChild(tiling);
      this.bgSprite = tiling;
    } else {
      // Placeholder: a vertical gradient drawn into a graphics object, tiled.
      const g = new Graphics();
      const h = 1600;
      // Approximate a gradient with stacked thin rects.
      const steps = 64;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const col = lerpColor(COLORS.BG_FALLBACK_TOP, COLORS.BG_FALLBACK_BOTTOM, t);
        g.rect(0, (i * h) / steps, this.worldWidth, h / steps + 1);
        g.fill({ color: col, alpha: 1 });
      }
      // Add a few fuzzy "bokeh" circles for character.
      for (let i = 0; i < 12; i++) {
        const cx = Math.random() * this.worldWidth;
        const cy = Math.random() * h;
        const r = 40 + Math.random() * 100;
        g.circle(cx, cy, r);
        g.fill({ color: 0xd4a574, alpha: 0.04 + Math.random() * 0.04 });
      }
      this.bgLayer.addChild(g);
      this.bgSprite = null;
    }
  }

  // ---------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    let dt = (now - this.lastT) / 1000;
    if (dt > 0.05) dt = 0.05; // clamp big stalls
    this.lastT = now;

    this.tick(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private tick(dt: number): void {
    const input = this.input.update(dt);

    // Drop friction depends on whether we're on a "wet trail" (low droplet density nearby).
    const onTrail = this.field.isPointOnDryGlass(this.drop.pos.x, this.drop.pos.y, this.drop.radius * 2);
    this.drop.update(dt, input.tiltX, onTrail);

    // Keep drop within horizontal world bounds (soft wall).
    if (this.drop.pos.x < this.drop.radius) {
      this.drop.pos.x = this.drop.radius;
      this.drop.vel.x = Math.abs(this.drop.vel.x) * 0.3;
    } else if (this.drop.pos.x > this.worldWidth - this.drop.radius) {
      this.drop.pos.x = this.worldWidth - this.drop.radius;
      this.drop.vel.x = -Math.abs(this.drop.vel.x) * 0.3;
    }

    // Camera follows the drop downward; never moves up.
    const followY = this.drop.pos.y - this.worldHeight * 0.42;
    const targetCam = Math.max(this.cameraY, followY);
    // Smooth with a fixed-rate lerp; also add a small constant drift for ambience.
    this.cameraY += (targetCam - this.cameraY) * Math.min(1, dt * 4);
    this.cameraY += GAME_CONFIG.SCROLL_SPEED_BASE * dt * 0;

    // Update micro field: seed ahead, cull behind.
    this.field.update(this.cameraY + this.worldHeight * GAME_CONFIG.MICRO_SPAWN_LOOKAHEAD, this.cameraY - 100);

    // Absorption: greedily consume any overlapping droplets this frame.
    let absorbedThisFrame = 0;
    for (let i = 0; i < 12; i++) {
      const hit = this.field.consumeOverlapping(this.drop.pos.x, this.drop.pos.y, this.drop.radius);
      if (!hit) break;
      this.drop.absorb(hit.radius);
      this.stats.absorbed++;
      absorbedThisFrame++;
    }
    if (absorbedThisFrame > 0) {
      this.audio.playCoalesce();
      this.chainCount += absorbedThisFrame;
      this.chainResetAt = performance.now();
    } else if (performance.now() - this.chainResetAt > 600 && this.chainCount > 0) {
      this.chainCount = 0;
    }

    // Add a trail segment as we move (sample at sub-step intervals).
    if (Math.hypot(this.drop.vel.x, this.drop.vel.y) > 30) {
      this.trail.push({
        x: this.drop.pos.x,
        y: this.drop.pos.y,
        r: this.drop.radius * GAME_CONFIG.TRAIL_WIDTH_MULT,
        age: 0,
      });
      this.cleanedPxRunning += Math.PI * this.drop.radius * this.drop.radius * 0.4;
      // Cap trail length to keep things snappy.
      if (this.trail.length > 800) this.trail.splice(0, this.trail.length - 800);
    }

    // Age trail segments.
    for (const t of this.trail) t.age += dt;
    while (this.trail.length > 0 && this.trail[0].age > GAME_CONFIG.TRAIL_FADE_TIME) {
      this.trail.shift();
    }

    // Update stats and notify.
    this.stats.size = this.drop.radius;
    this.stats.chain = this.chainCount;
    // Cleaned % is a rough indicator, capped at 100.
    const viewportArea = this.worldWidth * this.worldHeight;
    this.stats.cleanedPct = Math.min(100, (this.cleanedPxRunning / viewportArea) * 100);
    this.callbacks.onStatsUpdate?.(this.stats);
  }

  private render(): void {
    // Apply camera.
    this.worldContainer.y = -this.cameraY;

    // Background tiles vertically — keep it in front of the camera.
    if (this.bgSprite instanceof TilingSprite) {
      this.bgSprite.y = this.cameraY;
      this.bgSprite.height = this.worldHeight + 200;
      // Slight parallax so it doesn't feel pasted on.
      this.bgSprite.tilePosition.y = -this.cameraY * 0.4;
    } else if (this.bgSprite instanceof Sprite) {
      this.bgSprite.y = this.cameraY;
    } else {
      // Placeholder graphics — reposition the entire bg layer.
      this.bgLayer.y = this.cameraY;
    }

    // ----- Trail -----
    this.trailLayer.removeChildren();
    const trailG = new Graphics();
    for (const t of this.trail) {
      const ageT = t.age / GAME_CONFIG.TRAIL_FADE_TIME;
      const alpha = (1 - ageT) * 0.35;
      trailG.circle(t.x, t.y, t.r);
      trailG.fill({ color: COLORS.TRAIL, alpha });
    }
    this.trailLayer.addChild(trailG);

    // ----- Micro droplets (metaball layer) -----
    // Only draw the ones currently in view-ish band (cull for perf).
    const viewTop = this.cameraY - 40;
    const viewBot = this.cameraY + this.worldHeight + 40;

    this.microGfx.clear();
    const drops = this.field.getDroplets();
    for (const d of drops) {
      if (!d.alive) continue;
      if (d.pos.y < viewTop || d.pos.y > viewBot) continue;
      this.microGfx.circle(d.pos.x, d.pos.y, d.radius);
    }
    this.microGfx.fill({ color: COLORS.DROP_CORE, alpha: 1 });

    // ----- Main drop (metaball layer) -----
    this.dropGfx.clear();
    // Squash/stretch via local scale of the ellipse.
    const rx = this.drop.radius * this.drop.stretchX;
    const ry = this.drop.radius * this.drop.stretchY;
    this.dropGfx.ellipse(this.drop.pos.x, this.drop.pos.y, rx, ry);
    this.dropGfx.fill({ color: COLORS.DROP_CORE, alpha: 1 });

    // ----- Highlight overlay (crisp, no blur filter) -----
    this.highlightGfx.clear();
    const hx = this.drop.pos.x - rx * 0.3;
    const hy = this.drop.pos.y - ry * 0.4;
    const hr = Math.min(rx, ry) * 0.35;
    // Specular highlight.
    this.highlightGfx.circle(hx, hy, hr);
    this.highlightGfx.fill({ color: COLORS.DROP_HIGHLIGHT, alpha: 0.55 });
    // Tiny secondary highlight.
    this.highlightGfx.circle(hx + hr * 0.6, hy + hr * 0.5, hr * 0.35);
    this.highlightGfx.fill({ color: COLORS.DROP_HIGHLIGHT, alpha: 0.3 });
    // Rim lighting along the bottom.
    this.highlightGfx.arc(this.drop.pos.x, this.drop.pos.y, this.drop.radius * 0.95, 0.2, Math.PI - 0.2);
    this.highlightGfx.stroke({ color: COLORS.DROP_RIM, width: 1.2, alpha: 0.35 });
  }

  private handleResize(): void {
    const rect = this.host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Aspect-fit the virtual world width into the actual viewport width.
    const scale = rect.width / this.worldWidth;
    this.worldContainer.scale.set(scale);

    this.worldHeight = rect.height / scale;

    // Re-seed the field if we just got our first dimensions.
    if (this.field) {
      this.field.seedInitial(this.worldHeight * 1.5);
    }
  }
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
