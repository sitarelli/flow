# Flow

Un piccolo gioco zen di gocce d'acqua su vetro, costruito con React + TypeScript + PixiJS v8.

> **MVP — solo modalità Zen.** Le modalità Pannello e Tempesta sono pianificate per le iterazioni successive.

## 🚀 Avvio rapido

```bash
npm install
npm run dev
```

Apri `http://localhost:5173`. Funziona anche da mobile sulla stessa LAN (Vite mostra l'IP all'avvio).

## 📦 Build

```bash
npm run build
npm run preview
```

Output in `dist/`.

## ☁️ Deploy su Vercel

1. Pusha il repo su GitHub.
2. Su [vercel.com/new](https://vercel.com/new) importa il repo.
3. Vercel rileva automaticamente Vite. Il file `vercel.json` è già configurato.
4. Deploy.

Niente variabili d'ambiente, niente backend. Tutto statico.

## 🧱 Architettura

```
src/
├── main.tsx              entry point React
├── App.tsx               orchestra le fasi (menu / playing / paused)
├── components/
│   ├── GameCanvas.tsx    monta/smonta il motore PixiJS
│   ├── StartScreen.tsx
│   ├── HUD.tsx
│   ├── PauseScreen.tsx
│   └── Loading.tsx
├── game/                 game engine puro TypeScript, indipendente da React
│   ├── GameEngine.ts     loop, rendering, metaball
│   ├── Drop.ts           goccia principale (fisica + squash/stretch)
│   ├── MicroDropletField.ts   campo infinito di gocce statiche
│   ├── InputManager.ts   touch + gyroscope
│   ├── AudioManager.ts   Web Audio, pitch-shift pentatonico
│   ├── AssetLoader.ts    preload con fallback grazioso
│   ├── constants.ts      tuning del gameplay
│   └── types.ts
└── styles/
    └── global.css
```

**Principio**: React gestisce solo UI dichiarativa (menù, HUD). Il game engine è imperativo, in classi TypeScript pure, e non sa nulla di React. Comunicano via callback (`onStatsUpdate`).

## 🎨 Effetto metaball

L'effetto "gocce che si fondono" è ottenuto con il trucco classico in 2D:

1. Tutte le gocce sono disegnate come cerchi pieni in un `Container`.
2. Sul container si applica un `BlurFilter` (sfoca i bordi).
3. Poi un `ColorMatrixFilter` che amplifica l'alpha e la sotrae, creando un edge netto.

Il risultato: cerchi vicini si fondono in forme fluide. Parametri in `constants.ts` (`METABALL_BLUR`, `METABALL_THRESHOLD`, `METABALL_OFFSET`).

I riflessi specular sono disegnati **sopra** il filtro, in un layer separato, così rimangono nitidi.

## 🎮 Controlli

- **Mobile**: trascina il dito (swipe orizzontale) **oppure** inclina il dispositivo (giroscopio).
- **Desktop**: trascina il mouse.
- iOS richiede una permission prompt per il giroscopio: viene chiesta al primo tap su "Begin".

## 🔊 Audio

Tre file audio (vedi `ASSETS.md`):
- `ambient.mp3` — loop di sottofondo (pioggia/vapore).
- `coalesce.mp3` — singolo "ploc" cristallino. Viene **pitch-shiftato** runtime su una scala pentatonica man mano che la catena di fusioni cresce. Quindi serve **un solo file**, non 5.
- `split.mp3` — quando la goccia si divide (non ancora attivo nel MVP, riservato per dopo).

Tutto via Web Audio API. Il pulsante mute nella HUD ferma tutto.

## 🧪 Note sviluppo

- Il world è "infinito verso il basso": il `MicroDropletField` semina nuove gocce davanti alla camera e ricicla quelle dietro.
- La fisica è semplificata (no soft-body vero): la goccia è un cerchio con squash/stretch cosmetico. La sensazione di morbidezza arriva dal metaball filter.
- Il game loop è in `requestAnimationFrame` con `dt` clampato a 50ms per evitare salti su tab inattivo.
- Auto-pausa quando il tab perde focus.

## 📝 Asset

Vedi [`ASSETS.md`](./ASSETS.md) per la lista completa di file da fornire, con dimensioni, formato e descrizione di cosa devono contenere. **Il gioco gira anche senza asset** — usa placeholder generati a runtime — così puoi sviluppare e testare prima di averli pronti.

## 📄 Licenza

Personale. Modifica come ti pare.
