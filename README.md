# Fallacy Wright: Ace Logician 🦆⚖️

A Phoenix Wright-style browser game that teaches the top 20 logical fallacies through a comedic courtroom trial. Features AI voice acting powered by **KittenTTS** (25MB model, runs 100% client-side).

## Features

- 🎮 20 multiple-choice questions covering the most common logical fallacies
- 🗣️ AI voice acting with 8 distinct character voices (KittenTTS Nano)
- 🎵 Synth music and sound effects (Web Audio API)
- 📱 Phoenix Wright-style visual novel UI with character portraits
- ⚡ Runs entirely in the browser — no server needed for gameplay or TTS

## Quick Start

```bash
# Clone and install
git clone <your-repo>
cd fallacy-wright-game
npm install

# Development
npm run dev

# Build for production
npm run build
```

## Deploy to Vercel

1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy!

Or use the Vercel CLI:
```bash
npx vercel
```

## KittenTTS Voices

| Character | KittenTTS Voice | Speed | Personality |
|---|---|---|---|
| Phoenix Wright | Jasper | 1.05x | Confident attorney |
| Prosecutor Fallacious | Hugo | 0.88x | Dramatic prosecutor |
| Judge Gullible III | Bruno | 0.82x | Elderly judge |
| Larry Butts | Leo | 1.2x | Panicky defendant |
| Brenda Nosybody | Rosie | 0.95x | Security guard |
| Chad Mainstream | Leo | 1.25x | Influencer |
| Prof. Loopsworth | Hugo | 0.85x | Professor |
| Willow Earthchild | Kiki | 0.9x | Crystal lady |
| Dr. Von Stuffington | Bruno | 0.85x | Marine biologist |
| Narrator | Bella | 1.0x | Stage directions |

## Tech Stack

- React 18 + Vite
- KittenTTS Nano (15M params, ONNX Runtime Web)
- Web Audio API (music + SFX)
- SVG character portraits & backgrounds
- Zero backend dependencies

## Credits

- KittenTTS by [KittenML](https://github.com/KittenML/KittenTTS)
- ONNX Runtime Web by Microsoft
- Game script & design by Davis D AI Wiz
