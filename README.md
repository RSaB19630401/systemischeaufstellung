# Systemische Aufstellung

KI-gestützte systemische Aufstellung mit interaktivem Whiteboard – geführt durch einen Coach-Dialog.

![License](https://img.shields.io/badge/license-MIT-blue)

**Live:** [https://rsab19630401.github.io/systemischeaufstellung/](https://rsab19630401.github.io/systemischeaufstellung/)

## Was ist das?

Eine Web-App, die systemische Aufstellungen digital abbildet. Ein KI-Coach (Claude von Anthropic) führt den Nutzer durch den Aufstellungsprozess, stellt Fragen zu Beziehungen und Dynamiken, und platziert Figuren auf einem interaktiven Whiteboard. Der Nutzer kann die Figuren frei verschieben – die KI reagiert auf Veränderungen.

**Unterstützte Aufstellungstypen:**
- Familienaufstellung
- Organisationsaufstellung
- Strukturaufstellung
- Symptomaufstellung
- Freie Aufstellung

> **Hinweis:** Diese App ersetzt keine professionelle Beratung oder Therapie. Sie ist ein Werkzeug zur Reflexion.

## Features

- **Coach-Dialog** – KI-geführter Chat, der schrittweise durch die Aufstellung führt
- **Interaktives Whiteboard** – SVG-basiert mit Drag & Drop, handgezeichneter Ästhetik
- **Animationen** – Neue Personen erscheinen animiert, Verschiebungen pulsieren, Beziehungslinien zeichnen sich auf
- **Hybrid-Kopplung** – KI platziert Figuren automatisch, Nutzer kann frei verschieben, Änderungen fließen zurück in den Dialog
- **Emotionen** – Jede Person kann ein Gefühl zugewiesen bekommen
- **Beziehungstypen** – Eng, Distanziert, Konflikt, Abgebrochen, Verstrickt
- **Export** – JSON (vollständiger Zustand), SVG, PNG, PDF-Bericht
- **Import** – JSON-Zwischenstände wieder laden
- **Responsive** – Desktop und Mobil (PWA-fähig)
- **Sensible Themen** – KI zieht bei kritischen Themen eine klare Grenze und verweist auf professionelle Hilfe

## Architektur

```
┌──────────────────────────────────┐
│  GitHub Pages                    │
│  (Statische React-App)           │
│  rsab19630401.github.io/         │
│  systemischeaufstellung/         │
└───────────────┬──────────────────┘
                │ HTTPS
┌───────────────┴──────────────────┐
│  Cloudflare Worker               │
│  (API-Proxy, schützt API-Key)    │
│  systemische-aufstellung-api.    │
│  DEIN-SUBDOMAIN.workers.dev      │
└───────────────┬──────────────────┘
                │
┌───────────────┴──────────────────┐
│  Anthropic API                   │
│  (Claude Sonnet)                 │
└──────────────────────────────────┘
```

## Setup-Anleitung

### 1. Repository klonen

```bash
git clone https://github.com/RSaB19630401/systemischeaufstellung.git
cd systemischeaufstellung
npm install
```

### 2. Cloudflare Worker deployen

Der Worker ist der API-Proxy – er schützt deinen Anthropic API-Key.

```bash
# API-Key als Secret setzen (wird interaktiv abgefragt)
npm run worker:secret

# Worker deployen
npm run worker:deploy
```

Nach dem Deploy zeigt Wrangler die URL an, z.B.:
```
Published systemische-aufstellung-api
  https://systemische-aufstellung-api.DEIN-SUBDOMAIN.workers.dev
```

**Diese URL merken – sie wird im nächsten Schritt gebraucht!**

### 3. GitHub Pages konfigurieren

#### a) GitHub Pages aktivieren
1. Auf GitHub → Repository → **Settings** → **Pages**
2. Source: **GitHub Actions**

#### b) Worker-URL als Variable setzen
1. Auf GitHub → Repository → **Settings** → **Secrets and variables** → **Actions**
2. Tab **Variables** (nicht Secrets!)
3. **New repository variable**:
   - Name: `VITE_API_URL`
   - Value: `https://systemische-aufstellung-api.DEIN-SUBDOMAIN.workers.dev`

#### c) Deploy auslösen
Entweder pushen auf `main`, oder unter **Actions** → **Deploy to GitHub Pages** → **Run workflow**.

### 4. Lokal entwickeln

```bash
# Terminal 1: Worker lokal starten
# Erstelle worker/.dev.vars mit: ANTHROPIC_API_KEY=sk-ant-...
npm run worker:dev

# Terminal 2: Frontend starten (Vite-Proxy leitet /api an den Worker)
npm run dev
```

Die App läuft auf `http://localhost:3000`.

## Projektstruktur

```
systemischeaufstellung/
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Pages Auto-Deploy
├── worker/
│   ├── index.ts                  # Cloudflare Worker (API-Proxy)
│   └── wrangler.toml             # Worker-Konfiguration
├── functions/
│   └── api/
│       └── chat.ts               # (Alternative: Cloudflare Pages Function)
├── public/
│   ├── favicon.svg
│   └── manifest.json
├── src/
│   ├── api/
│   │   └── coach.ts              # KI-Coach Logik & System-Prompt
│   ├── components/
│   │   ├── ChatPanel.tsx
│   │   ├── Legend.tsx
│   │   ├── PersonDetail.tsx
│   │   ├── Toolbar.tsx
│   │   ├── WelcomeScreen.tsx
│   │   └── Whiteboard.tsx
│   ├── utils/
│   │   ├── export.ts
│   │   └── svg-helpers.ts
│   ├── types.ts
│   ├── constants.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Export-Formate

| Format | Inhalt |
|--------|--------|
| **JSON** | Vollständiger Zustand inkl. Chat-Verlauf. Kann wieder importiert werden. |
| **SVG** | Vektorgrafik des Aufstellungsbretts. |
| **PNG** | Hochauflösendes Rasterbild. |
| **PDF** | Vollständiger Bericht mit Bild, Beteiligten und Gesprächsverlauf. |

## Konfiguration

### Modell ändern

In `worker/index.ts` das Modell anpassen:

```typescript
model: 'claude-sonnet-4-20250514', // oder claude-opus-4-20250514
```

### Aufstellungstypen erweitern

In `src/constants.ts` neue Typen hinzufügen und in `src/types.ts` den Typ ergänzen.

## Sicherheit

- Der Anthropic API-Key liegt **ausschließlich** im Cloudflare Worker (als Secret)
- Das Frontend kennt den Key nicht
- CORS ist auf die GitHub Pages Domain beschränkt
- Localhost ist für Entwicklung erlaubt

## Lizenz

MIT
