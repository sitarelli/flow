interface Props {
  onStart: () => void;
}

export function StartScreen({ onStart }: Props) {
  return (
    <div className="start-screen">
      <h1 className="start-screen__title">Flow</h1>
      <p className="start-screen__subtitle">Zen mode</p>
      <p className="start-screen__hint">
        Inclina il dispositivo o trascina il dito per <em>guidare</em> la goccia.<br />
        Cresce assorbendo le altre. Lascia che la gravità faccia il resto.
      </p>
      <button className="start-screen__button" onClick={onStart}>
        Begin
      </button>
      <p className="start-screen__footer">Tap, breathe, flow</p>
    </div>
  );
}
