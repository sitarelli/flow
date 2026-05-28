import { ASSET_PATHS, GAME_CONFIG } from './constants';

/**
 * Simple Web Audio wrapper. Loads short SFX into AudioBuffers and the
 * looping ambient track as an <audio> element (so it works on iOS).
 *
 * For coalescence sounds we pitch-shift a single sample up a pentatonic
 * scale as the chain grows — gives the "growing avalanche melody" feel
 * without procedural synthesis (user supplies the source sample).
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private coalesceBuffer: AudioBuffer | null = null;
  private splitBuffer: AudioBuffer | null = null;
  private ambientAudio: HTMLAudioElement | null = null;

  private lastCoalesceAt = 0;
  private chainIndex = 0;
  private chainResetTimer = 0;

  private initialized = false;
  private muted = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.7;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.masterGain);

      await Promise.all([
        this.loadSfx(ASSET_PATHS.AUDIO_COALESCE).then((b) => (this.coalesceBuffer = b)),
        this.loadSfx(ASSET_PATHS.AUDIO_SPLIT).then((b) => (this.splitBuffer = b)),
      ]);

      this.initialized = true;
    } catch {
      // Audio failed — game runs silent.
      this.initialized = false;
    }
  }

  /** Must be called from a user gesture (button click). */
  async unlock(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  startAmbient(): void {
    if (this.ambientAudio) return;
    try {
      const a = new Audio(ASSET_PATHS.AUDIO_AMBIENT);
      a.loop = true;
      a.volume = 0.45;
      a.preload = 'auto';
      a.play().catch(() => {
        // Likely autoplay block — silently ignore. Ambient is optional.
      });
      this.ambientAudio = a;
    } catch {
      // Ignore.
    }
  }

  stopAmbient(): void {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
      this.ambientAudio = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 0.85;
    if (this.ambientAudio) this.ambientAudio.muted = muted;
  }

  /** Plays the next note in the pentatonic chain. */
  playCoalesce(): void {
    if (!this.initialized || this.muted) return;
    if (!this.ctx || !this.sfxGain || !this.coalesceBuffer) return;

    const now = performance.now();
    if (now - this.lastCoalesceAt < GAME_CONFIG.COALESCE_COOLDOWN_MS) return;
    this.lastCoalesceAt = now;

    // Reset chain after a short pause.
    if (now - this.chainResetTimer > 600) {
      this.chainIndex = 0;
    }
    this.chainResetTimer = now;

    const scale = GAME_CONFIG.COALESCE_PITCH_SCALE;
    const semitone = scale[this.chainIndex % scale.length] + Math.floor(this.chainIndex / scale.length) * 12;
    const detune = semitone * 100; // cents
    this.chainIndex++;

    const src = this.ctx.createBufferSource();
    src.buffer = this.coalesceBuffer;
    src.detune.value = detune;
    const g = this.ctx.createGain();
    g.gain.value = 0.6 + Math.min(0.4, this.chainIndex * 0.02);
    src.connect(g).connect(this.sfxGain);
    src.start();
  }

  playSplit(): void {
    if (!this.initialized || this.muted) return;
    if (!this.ctx || !this.sfxGain || !this.splitBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.splitBuffer;
    src.connect(this.sfxGain);
    src.start();
  }

  destroy(): void {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }

  private async loadSfx(url: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return await this.ctx.decodeAudioData(buf);
    } catch {
      return null;
    }
  }
}
