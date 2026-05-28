import { GameStats } from '../game/types';

interface Props {
  stats: GameStats;
  muted: boolean;
  onTogglePause: () => void;
  onToggleMute: () => void;
}

export function HUD({ stats, muted, onTogglePause, onToggleMute }: Props) {
  return (
    <>
      <div className="hud">
        <div className="hud__metric">
          <span className="hud__label">Size</span>
          <span className="hud__value">{Math.round(stats.size)}</span>
        </div>
        <div className="hud__metric hud__metric--right">
          <span className="hud__label">Chain</span>
          <span className="hud__value">{stats.chain}</span>
        </div>
      </div>

      <button
        className="pause-button"
        onClick={onTogglePause}
        aria-label="Pausa"
        style={{ pointerEvents: 'auto' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="6" y="5" width="4" height="14" />
          <rect x="14" y="5" width="4" height="14" />
        </svg>
      </button>

      <button
        className="pause-button"
        onClick={onToggleMute}
        aria-label={muted ? 'Riattiva audio' : 'Disattiva audio'}
        style={{ right: '1.5rem', left: 'auto', transform: 'none', pointerEvents: 'auto' }}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 5L6 9H3v6h3l5 4V5z" />
            <line x1="17" y1="9" x2="23" y2="15" />
            <line x1="23" y1="9" x2="17" y2="15" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 5L6 9H3v6h3l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 010 7" />
            <path d="M18.5 5.5a9 9 0 010 13" />
          </svg>
        )}
      </button>
    </>
  );
}
