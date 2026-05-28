interface Props {
  onResume: () => void;
  onRestart: () => void;
}

export function PauseScreen({ onResume, onRestart }: Props) {
  return (
    <div className="start-screen">
      <h1 className="start-screen__title">Paused</h1>
      <p className="start-screen__subtitle">Breathe</p>
      <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
        <button className="start-screen__button" onClick={onResume}>
          Resume
        </button>
        <button
          className="start-screen__button"
          onClick={onRestart}
          style={{ borderColor: 'var(--color-fg-faint)', color: 'var(--color-fg-dim)' }}
        >
          Restart
        </button>
      </div>
    </div>
  );
}
