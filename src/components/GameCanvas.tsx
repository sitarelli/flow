import { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { GameStats } from '../game/types';

interface Props {
  active: boolean;
  paused: boolean;
  muted: boolean;
  onStats?: (stats: GameStats) => void;
  onReady?: (engine: GameEngine) => void;
}

/**
 * Mounts the PixiJS canvas into a div ref. The engine is created on mount
 * and destroyed on unmount; React only sends imperative pause/resume/mute
 * signals via effects.
 */
export function GameCanvas({ active, paused, muted, onStats, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Mount the engine once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    const engine = new GameEngine(host, {
      onStatsUpdate: (s) => onStats?.(s),
    });
    engineRef.current = engine;

    engine.init().then(() => {
      if (cancelled) {
        engine.destroy();
        return;
      }
      onReady?.(engine);
    });

    return () => {
      cancelled = true;
      engine.destroy();
      engineRef.current = null;
    };
    // Engine is created once and not recreated; props are forwarded via effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start / pause / resume based on active+paused props.
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    if (active && !paused) {
      eng.resume();
      eng.start();
    } else if (paused) {
      eng.pause();
    }
  }, [active, paused]);

  // Mute toggle.
  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  return <div ref={hostRef} className="game-canvas-wrapper" />;
}
