# Systemische Aufstellung

KI-gestützte systemische Aufstellung mit interaktivem Whiteboard – geführt durch einen Coach-Dialog.

![License](https://img.shields.io/badge/license-MIT-blue)

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
- **Hybrid-Kopplung** – KI platziert Figuren automatisch, Nutzer kann frei verschieben, Änderungen fließen zurück in den Dialog
- **Emotionen** – Jede Person kann ein Gefühl zugewiesen bekommen (Neutral, Zufrieden, Traurig, Wütend, Ängstlich, Verwirrt, Hoffnungsvoll)
- **Beziehungstypen** – Eng, Distanziert, Konflikt, Abgebrochen, Verstrickt
- **Export** – JSON (vollständiger Zustand), SVG, PNG, PDF-Bericht
- **Import** – JSON-Zwischenstände wieder laden
- **Responsive** – Desktop und Mobil (PWA-fähig)
- **Sensible Themen** – KI zieht bei kritischen Themen eine klare Grenze und verweist auf professionelle Hilfe

## Architektur

```
┌─────────────────────────────────────────────┐
│  Cloudflare Pages (Static Site)             │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │  React SPA   │  │  Whiteboard (SVG)   │  │
│  │  Chat Panel  │◄─┼──►Drag & Drop       │  │
│  └──────┬───────┘  └─────────────────────┘  │
│         │                                    │
│  ┌──────┴───────────────────────────────┐   │
│  │  Cloudflare Pages Function (/api)    │   │
│  │  API-Proxy (schützt den API-Key)     │   │
│  └──────┬───────────────────────────────┘   │
└─────────┼───────────────────────────────────┘
          │
  ┌───────┴──────────┐
  │  Anthropic API   │
  │  Claude Sonnet   │
  └──────────────────┘
```

## Schnellstart

### Voraussetzungen

- Node.js 18+
- Ein [Anthropic API Key](https://console.anthropic.com/)

### Lokal entwickeln

```bash
# Repository klonen
git clone https://github.com/DEIN-USER/systemische-aufstellung.git
cd systemische-aufstellung

# Abhängigkeiten installieren
npm install

# API-Key konfigurieren (für lokale Entwicklung)
echo "ANTHROPIC_API_KEY=sk-ant-..." > .dev.vars

# Entwicklungsserver starten (Frontend + Worker)
npm run dev
```

Der Dev-Server läuft auf `http://localhost:3000`. Der Vite-Proxy leitet `/api/*` an den lokalen Cloudflare Worker weiter.

### Auf Cloudflare deployen

```bash
# Projekt bauen
npm run build

# Mit Wrangler deployen
npx wrangler pages deploy dist
```

#### API-Key als Secret setzen:

```bash
npx wrangler pages secret put ANTHROPIC_API_KEY
# Dann den Key eingeben
```

Alternativ im Cloudflare Dashboard unter **Pages → Settings → Environment Variables** den Key `ANTHROPIC_API_KEY` setzen.

## Projektstruktur

```
systemische-aufstellung/
├── functions/
│   └── api/
│       └── chat.ts          # Cloudflare Pages Function (API-Proxy)
├── public/
│   ├── favicon.svg
│   └── manifest.json        # PWA-Manifest
├── src/
│   ├── api/
│   │   └── coach.ts         # KI-Coach Logik & System-Prompt
│   ├── components/
│   │   ├── ChatPanel.tsx     # Chat-Interface
│   │   ├── Legend.tsx        # Beziehungstypen-Legende
│   │   ├── PersonDetail.tsx  # Emotions-Auswahl
│   │   ├── Toolbar.tsx       # Menü mit Export/Import
│   │   ├── WelcomeScreen.tsx # Typ-Auswahl & Import
│   │   └── Whiteboard.tsx    # Interaktives SVG-Board
│   ├── utils/
│   │   ├── export.ts         # Export/Import-Funktionen
│   │   └── svg-helpers.ts    # Handgezeichnete SVG-Pfade
│   ├── types.ts              # TypeScript-Typen
│   ├── constants.ts          # Farben, Emotionen, Aufstellungstypen
│   ├── App.tsx               # Haupt-App mit State Management
│   ├── main.tsx              # Entry Point
│   └── index.css             # Globales Styling
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

## Export-Formate

| Format | Inhalt |
|--------|--------|
| **JSON** | Vollständiger Zustand: Personen, Beziehungen, Chat-Verlauf. Kann wieder importiert werden. |
| **SVG** | Vektorgrafik des Aufstellungsbretts. Skalierbar, editierbar. |
| **PNG** | Hochauflösendes Rasterbild (3x Skalierung). |
| **PDF** | Vollständiger Bericht mit Bild, Beteiligten, Beziehungen und Gesprächsverlauf. |

## Konfiguration

### Modell ändern

In `functions/api/chat.ts` das Modell anpassen:

```typescript
model: 'claude-sonnet-4-20250514', // oder claude-opus-4-20250514
```

### Aufstellungstypen erweitern

In `src/constants.ts` neue Typen hinzufügen:

```typescript
export const CONSTELLATION_TYPES: ConstellationTypeInfo[] = [
  // ... bestehende Typen
  { id: 'tetralemma', label: 'Tetralemma', icon: '🔀', desc: 'Entscheidungsfindung mit vier Positionen' },
];
```

Und den Typ in `src/types.ts` ergänzen:

```typescript
export type ConstellationTypeId = 
  | 'family' | 'organization' | 'structural' | 'symptom' | 'custom'
  | 'tetralemma';
```

## Sicherheit

- Der Anthropic API-Key wird **nie** im Frontend exponiert
- Die Cloudflare Pages Function agiert als Proxy
- Der Key wird als Environment Variable / Secret gesetzt
- CORS-Header sind konfiguriert

## Lizenz

MIT

## Mitwirken

Pull Requests und Issues sind willkommen.
