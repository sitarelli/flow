import { InputState } from './types';
import { GAME_CONFIG } from './constants';

type Mode = 'touch' | 'gyro' | 'both';

/**
 * Unified input that maps either gyroscope tilt or touch swipes to a
 * normalized [-1, 1] horizontal force. Vertical is only used for testing.
 */
export class InputManager {
  private state: InputState = { tiltX: 0, tiltY: 0 };
  private mode: Mode = 'both';
  private el: HTMLElement;

  // Touch tracking
  private touchActive = false;
  private lastTouchX = 0;
  private lastTouchTime = 0;
  // Smoothed touch-derived force, decays over time so taps don't get stuck.
  private touchForce = 0;

  // Gyro tracking — gamma is left/right tilt in degrees.
  private gyroGamma = 0;
  private gyroAvailable = false;

  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: () => void;
  private boundOrientation: (e: DeviceOrientationEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: () => void;

  constructor(el: HTMLElement) {
    this.el = el;
    this.boundTouchStart = this.onTouchStart.bind(this);
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);
    this.boundOrientation = this.onOrientation.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
  }

  start(): void {
    this.el.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    this.el.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    this.el.addEventListener('touchend', this.boundTouchEnd);
    this.el.addEventListener('touchcancel', this.boundTouchEnd);
    // Desktop fallback: drag the mouse to deflect.
    this.el.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);

    // Gyroscope — needs permission on iOS Safari.
    this.tryEnableGyro();
  }

  stop(): void {
    this.el.removeEventListener('touchstart', this.boundTouchStart);
    this.el.removeEventListener('touchmove', this.boundTouchMove);
    this.el.removeEventListener('touchend', this.boundTouchEnd);
    this.el.removeEventListener('touchcancel', this.boundTouchEnd);
    this.el.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('deviceorientation', this.boundOrientation);
  }

  /** Must be called from a user-gesture handler on iOS. */
  async tryEnableGyro(): Promise<boolean> {
    type IOSOrientationCtor = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    const Ctor = DeviceOrientationEvent as IOSOrientationCtor;

    try {
      if (typeof Ctor.requestPermission === 'function') {
        const result = await Ctor.requestPermission();
        if (result !== 'granted') return false;
      }
      window.addEventListener('deviceorientation', this.boundOrientation);
      this.gyroAvailable = true;
      return true;
    } catch {
      return false;
    }
  }

  /** Call every frame to compute the current input vector. */
  update(dt: number): InputState {
    // Decay touch force when not actively swiping (returns to neutral).
    if (!this.touchActive) {
      this.touchForce *= Math.pow(0.001, dt); // exponential decay
      if (Math.abs(this.touchForce) < 0.01) this.touchForce = 0;
    }

    // Combine: prefer the strongest signal, weighted.
    const touch = clamp(this.touchForce * GAME_CONFIG.TOUCH_SENSITIVITY, -1, 1);
    const gyro = this.gyroAvailable
      ? clamp((this.gyroGamma / 30) * GAME_CONFIG.TILT_SENSITIVITY, -1, 1)
      : 0;

    let tiltX = 0;
    if (this.mode === 'touch') tiltX = touch;
    else if (this.mode === 'gyro') tiltX = gyro;
    else tiltX = Math.abs(touch) > Math.abs(gyro) ? touch : gyro;

    this.state.tiltX = tiltX;
    this.state.tiltY = 0;
    return this.state;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const t = e.touches[0];
    this.touchActive = true;
    this.lastTouchX = t.clientX;
    this.lastTouchTime = performance.now();
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const t = e.touches[0];
    const now = performance.now();
    const dt = Math.max(1, now - this.lastTouchTime) / 1000;
    const dx = t.clientX - this.lastTouchX;
    // Convert pixels/second of swipe to a [-1, 1] force, smoothed.
    const force = clamp((dx / dt) / 600, -1, 1);
    this.touchForce = lerp(this.touchForce, force, 0.35);
    this.lastTouchX = t.clientX;
    this.lastTouchTime = now;
  }

  private onTouchEnd(): void {
    this.touchActive = false;
  }

  private onMouseDown(e: MouseEvent): void {
    this.touchActive = true;
    this.lastTouchX = e.clientX;
    this.lastTouchTime = performance.now();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.touchActive) return;
    const now = performance.now();
    const dt = Math.max(1, now - this.lastTouchTime) / 1000;
    const dx = e.clientX - this.lastTouchX;
    const force = clamp((dx / dt) / 600, -1, 1);
    this.touchForce = lerp(this.touchForce, force, 0.35);
    this.lastTouchX = e.clientX;
    this.lastTouchTime = now;
  }

  private onMouseUp(): void {
    this.touchActive = false;
  }

  private onOrientation(e: DeviceOrientationEvent): void {
    if (e.gamma == null) return;
    // Smooth a bit so the drop doesn't jitter.
    this.gyroGamma = lerp(this.gyroGamma, e.gamma, 0.25);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
