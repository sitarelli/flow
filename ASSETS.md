# Asset Specifications

Tutti i file vanno in `public/assets/`. Il gioco **funziona anche senza di essi** (placeholder generati a runtime), così puoi sviluppare la logica e aggiungere gli asset incrementalmente.

I percorsi qui sotto corrispondono esattamente a quelli in `src/game/constants.ts` → `ASSET_PATHS`. Se cambi nome a un file, aggiorna anche quella costante.

---

## 🖼️ Immagini

### 1. Sfondo (`public/assets/images/background.png`)

Lo sfondo principale visibile attraverso il vetro. **L'asset più importante visivamente**.

| Specifica | Valore |
|---|---|
| **Nome file** | `background.png` |
| **Formato** | PNG (con compressione lossless) o JPG (consigliato JPG, sfondo non ha trasparenze) |
| **Estensione effettiva** | `.png` — se preferisci JPG salvalo come `background.jpg` e aggiorna `ASSET_PATHS.BACKGROUND` |
| **Dimensioni** | **1080 × 1920 px** (rapporto 9:16, mobile vertical) |
| **Risoluzione raddoppiata (opzionale, retina)** | 2160 × 3840 px |
| **Peso target** | ≤ 400 KB (importante per il caricamento mobile) |

**Cosa deve contenere:**
- Effetto **bokeh** sfocato — luci morbide e diffuse, niente forme nette.
- **Tonalità**: dal blu profondo (in alto) al verde salvia/teal (centro) fino a un ambrato caldo molto attenuato (in basso). Oppure, alternativa più calda: ambrato/oro in alto, blu in basso (luci di città di notte).
- Atmosfera "finestra di una stanza accogliente di notte" o "vetro di un treno sotto la pioggia". Niente elementi riconoscibili (volti, scritte, oggetti definiti).
- Niente vignette nette ai bordi (il gioco si scrollerà verticalmente sopra l'immagine, quindi i bordi top/bottom devono potersi "ripetere" in modo non troppo evidente — il codice usa già un `TilingSprite` con un leggero parallasse, ma comunque punta a un'immagine **mosaicabile verticalmente** o almeno con bordi simili in alto e in basso).

**Prompt suggerito per generatore AI di immagini:**
> "Abstract bokeh background, deep teal-blue at top transitioning to warm amber tones at bottom, soft out-of-focus circular lights of varying sizes, cinematic, blurred, dreamy, no recognizable objects, vertical composition 9:16, no text"

---

### 2. (Opzionale) Riflesso/highlight della goccia (`public/assets/images/drop_highlight.png`)

**Non strettamente necessario**: nel MVP il riflesso è disegnato programmaticamente con `Graphics`. Lo includo come opzionale nel caso volessi un look più organico.

| Specifica | Valore |
|---|---|
| **Nome file** | `drop_highlight.png` |
| **Formato** | PNG con **canale alpha trasparente** |
| **Dimensioni** | 256 × 256 px |
| **Peso target** | ≤ 30 KB |

**Cosa deve contenere:**
- Un singolo highlight bianco/luminoso con sfumatura morbida, posizionato in alto-sinistra (tipico riflesso speculare di una sfera lucida).
- Sfondo completamente trasparente.
- Niente bordi.

---

## 🔊 Audio

### 3. Ambient di sfondo (`public/assets/audio/ambient.mp3`)

Loop di sottofondo continuo. Suona per tutta la sessione.

| Specifica | Valore |
|---|---|
| **Nome file** | `ambient.mp3` |
| **Formato** | MP3 (massima compatibilità). Alternativa: OGG, salva come `ambient.ogg` e aggiorna `ASSET_PATHS`. |
| **Bitrate** | 128–160 kbps |
| **Durata** | **30–60 secondi** (verrà loopato senza fade — meglio se l'inizio e la fine si incollano bene) |
| **Peso target** | ≤ 800 KB |
| **Volume** | Mixato basso, headroom abbondante (il codice lo riproduce a 0.45 di volume base) |

**Cosa deve contenere:**
- **Pioggia leggera** che picchietta su un vetro, **oppure** vapore caldo, **oppure** un'aria notturna molto soffusa con un brusio lontano.
- **Nessun ritmo evidente, niente strumenti melodici** — è puro tessuto ASMR.
- Il loop deve essere **seamless**: chiedi al tool di generarlo con "seamless loop" e verifica in DAW che inizio e fine combacino.

**Prompt suggerito:**
> "ASMR ambient rain on window glass, soft, no music, no melody, seamless loop, calming, sleepy atmosphere, very low frequencies present but not boomy, 45 seconds"

---

### 4. Suono di fusione/assorbimento (`public/assets/audio/coalesce.mp3`)

**Un singolo "ploc" cristallino**. Il codice lo **pitch-shifta runtime** in salita su una scala pentatonica (C, D, E, G, A → poi ottava sopra → ottava ancora più sopra...). Quindi serve **un solo file**, non cinque.

| Specifica | Valore |
|---|---|
| **Nome file** | `coalesce.mp3` |
| **Formato** | MP3 o OGG |
| **Bitrate** | 192 kbps (qualità più alta perché viene pitch-shiftato) |
| **Durata** | **200–500 ms** (corto!) |
| **Peso target** | ≤ 25 KB |
| **Nota target** | Registralo/generalo intorno a **C4 (Do centrale, 261.63 Hz)** — è il "tono zero" da cui parte la scala. Se è un suono percussivo senza pitch definito, va comunque bene ma sembrerà più "secco". |

**Cosa deve contenere:**
- Un singolo evento sonoro: una piccola goccia che entra in acqua, oppure una nota cristallina (kalimba, glockenspiel, marimba con martelletto morbido, harp pluck).
- Attacco morbido, decay corto-medio, sustain praticamente assente.
- Niente riverbero pesante (sarà aggiunto in mix se serve).

**Prompt suggerito:**
> "Single soft water droplet splash plink, crystalline glassy tone, C4 pitch, 400ms, very clean, no reverb, no background, mono, suitable for pitch shifting"

---

### 5. Suono di divisione (`public/assets/audio/split.mp3`)

**Riservato per modalità future**. Suona quando una goccia troppo grande si spezza in due. Nel MVP non viene invocato, ma puoi prepararlo per quando attiveremo la meccanica.

| Specifica | Valore |
|---|---|
| **Nome file** | `split.mp3` |
| **Formato** | MP3 o OGG |
| **Durata** | 400–700 ms |
| **Peso target** | ≤ 35 KB |

**Cosa deve contenere:**
- Un "schlick" liquido — una goccia che si separa con tensione superficiale che cede.
- Più morbido e più "umido" del suono di fusione.

---

## 📋 Riepilogo file da creare

```
public/assets/
├── images/
│   ├── background.png       ← essenziale
│   └── drop_highlight.png   ← opzionale
└── audio/
    ├── ambient.mp3          ← consigliato (esperienza zen)
    ├── coalesce.mp3         ← essenziale per il feedback
    └── split.mp3            ← per modalità future
```

**Priorità minima per un primo test online**: `background.png` + `coalesce.mp3`. Tutto il resto è incrementale.

---

## 🛠️ Verifica

Quando hai gli asset:
1. Mettili nelle cartelle indicate.
2. `npm run dev`.
3. Apri la console del browser: se un file non si carica, il messaggio è silenzioso (graceful fallback), ma puoi controllare il pannello Network.
4. Se vuoi cambiare nome o estensione (es. JPG invece di PNG), modifica `src/game/constants.ts` → `ASSET_PATHS`.

---

## ⚙️ Tuning post-asset

Una volta inseriti gli asset, ci sono parametri in `src/game/constants.ts` che vorrai sicuramente aggiustare al tatto:

- `METABALL_BLUR` (default `8`) — quanto si "incollano" le gocce vicine. Più alto = forme più morbide ma più pesante.
- `METABALL_THRESHOLD` (default `22`) — nitidezza del bordo. Più alto = bordo più netto.
- `MICRO_DROPLET_DENSITY` (default `0.00018`) — quante gocce per pixel². Più alto = vetro più "denso".
- `GRAVITY_BASE` / `GRAVITY_PER_RADIUS` — quanto velocemente accelera la goccia col crescere.
- `TOUCH_SENSITIVITY` / `TILT_SENSITIVITY` — reattività dei controlli.

Tutti i numeri sono commentati in linea.
