// All physics units are in normalized pixels (renderer handles scaling).
// Tweak these to change game feel without touching logic.

export const GAME_CONFIG = {
  // World — virtual width used for physics; height is derived from aspect ratio.
  WORLD_WIDTH: 720,

  // Main droplet
  DROP_INITIAL_RADIUS: 14,
  DROP_MIN_RADIUS: 8,
  DROP_MAX_RADIUS: 70,
  DROP_SPLIT_THRESHOLD: 60, // splits if it grows beyond this and moves fast

  // Physics
  GRAVITY_BASE: 80, // px/s² baseline gravity pull on the drop
  GRAVITY_PER_RADIUS: 18, // additional gravity per radius unit above min
  FRICTION_BASE: 0.985, // surface friction coefficient per frame
  FRICTION_TRAIL_BOOST: 0.998, // less friction when sliding on already-wet glass
  FRICTION_DRY_PENALTY: 0.94, // more friction on dry/dusty glass
  MAX_VELOCITY: 600,

  // Input
  TILT_SENSITIVITY: 0.6, // multiplier for gyroscope tilt → horizontal force
  TOUCH_SENSITIVITY: 0.9, // multiplier for swipe delta → horizontal force

  // Micro-droplets (static field)
  MICRO_DROPLET_DENSITY: 0.00018, // droplets per px² of viewport
  MICRO_DROPLET_MIN_R: 2,
  MICRO_DROPLET_MAX_R: 5,
  // How much mass a micro droplet adds when absorbed (drop area increases)
  ABSORPTION_GAIN: 0.25,

  // Trail (cleaned glass)
  TRAIL_WIDTH_MULT: 1.6, // trail is a bit wider than the drop
  TRAIL_FADE_TIME: 8, // seconds for trail to fade back

  // Camera / scroll
  SCROLL_SPEED_BASE: 30, // baseline downward camera scroll px/s
  SCROLL_SPEED_FOLLOW: 0.55, // how much scroll follows drop velocity

  // Visual
  METABALL_BLUR: 8,
  METABALL_THRESHOLD: 22, // ColorMatrix alpha multiplier (higher = sharper edges)
  METABALL_OFFSET: -10, // ColorMatrix alpha offset

  // Audio
  COALESCE_PITCH_SCALE: [0, 2, 4, 7, 9], // pentatonic semitone offsets (C, D, E, G, A)
  COALESCE_COOLDOWN_MS: 40, // min ms between coalescence sounds

  // Spawn
  MICRO_SPAWN_LOOKAHEAD: 1.5, // screens-worth of droplets pre-spawned below view
};

export const COLORS = {
  // Drop tinting (overlay on top of metaball form)
  DROP_CORE: 0xb8d4e3,
  DROP_HIGHLIGHT: 0xffffff,
  DROP_RIM: 0x2a4a6b,
  // Trail color (pure alpha mask, color is multiply with bg)
  TRAIL: 0x4a6b8a,
  // Background fallback if image fails to load
  BG_FALLBACK_TOP: 0x0a1428,
  BG_FALLBACK_MID: 0x1a2842,
  BG_FALLBACK_BOTTOM: 0x0a0e1a,
};

export const ASSET_PATHS = {
  BACKGROUND: 'assets/images/background.png',
  DROP_HIGHLIGHT: 'assets/images/drop_highlight.png',
  AUDIO_AMBIENT: 'assets/audio/ambient.mp3',
  AUDIO_COALESCE: 'assets/audio/coalesce.mp3', // single one-shot, pitch-shifted per hit
  AUDIO_SPLIT: 'assets/audio/split.mp3',
};
