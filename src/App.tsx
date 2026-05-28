import { useCallback, useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { StartScreen } from './components/StartScreen';
import { PauseScreen } from './components/PauseScreen';
import { HUD } from './components/HUD';
import { GameStats, GamePhase } from './game/types';
import { GameEngine } from './game/GameEngine';

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [muted, setMuted] = useState(false);
  const [stats, setStats] = useState<GameStats>({ size: 14, absorbed: 0, cleanedPct: 0, chain: 0 });
  // Bump this key to force a full re-mount of the canvas (a clean restart).
  const [restartKey, setRestartKey] = useState(0);
  const [engine, setEngine] = useState<GameEngine | null>(null);

  const handleStart = useCallback(async () => {
    // Try to request gyro permission inside the user gesture.
    if (engine) await engine.enableGyro();
    setPhase('playing');
  }, [engine]);

  const handleTogglePause = useCallback(() => {
    setPhase((p) => (p === 'playing' ? 'paused' : 'playing'));
  }, []);

  const handleResume = useCallback(() => setPhase('playing'), []);

  const handleRestart = useCallback(() => {
    setStats({ size: 14, absorbed: 0, cleanedPct: 0, chain: 0 });
    setRestartKey((k) => k + 1);
    setPhase('menu');
  }, []);

  // Pause when tab is hidden (saves battery, stays calm).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setPhase((p) => (p === 'playing' ? 'paused' : p));
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const active = phase === 'playing' || phase === 'paused';
  const paused = phase !== 'playing';

  return (
    <>
      <GameCanvas
        key={restartKey}
        active={active}
        paused={paused}
        muted={muted}
        onStats={setStats}
        onReady={setEngine}
      />

      {phase === 'playing' && (
        <HUD
          stats={stats}
          muted={muted}
          onTogglePause={handleTogglePause}
          onToggleMute={() => setMuted((m) => !m)}
        />
      )}

      {phase === 'menu' && <StartScreen onStart={handleStart} />}
      {phase === 'paused' && <PauseScreen onResume={handleResume} onRestart={handleRestart} />}
    </>
  );
}
