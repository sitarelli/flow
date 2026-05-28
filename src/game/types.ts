export interface Vec2 {
  x: number;
  y: number;
}

export interface MicroDropletData {
  pos: Vec2;
  radius: number;
  alive: boolean;
}

export interface GameStats {
  size: number; // current drop radius
  absorbed: number; // count of micro-droplets absorbed
  cleanedPct: number; // % of viewport currently cleaned
  chain: number; // current coalescence chain
}

export type GamePhase = 'menu' | 'loading' | 'playing' | 'paused';

export interface InputState {
  // Horizontal force in [-1, 1] coming from tilt or swipe.
  tiltX: number;
  // Vertical force in [-1, 1]; we mostly use this only for testing.
  tiltY: number;
}
