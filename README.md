# Fallacy Wright: Ace Logician 🦆⚖️

A Phoenix Wright-style browser game that teaches the top 20 logical fallacies through a comedic courtroom trial. Features voice acting via the Web Speech API (runs 100% client-side, no downloads needed).

## Features

- 🎮 20 multiple-choice questions covering the most common logical fallacies
- 🗣️ Voice acting with distinct character voices (Web Speech API)
- 🎵 Synth music and sound effects (Web Audio API)
- 📱 Phoenix Wright-style visual novel UI with detailed SVG character portraits
- ⚡ Runs entirely in the browser — no server needed

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

## Characters

| Character | Role | Personality |
|---|---|---|
| Phoenix Wright | Defense Attorney | Confident, determined protagonist |
| Prosecutor Fallacious | Prosecutor | Dramatic, scheming antagonist |
| Judge Gullible III | Judge | Elderly, easily swayed (secretly the villain) |
| Larry Butts | Defendant | Panicky, goofy best friend |
| Brenda Nosybody | Security Guard | Clipped, suspicious witness |
| Chad Mainstream | Influencer | Hyper bro, 2.3M followers |
| Prof. Loopsworth | Professor of Logic | Pompous, circular reasoner |
| Willow Earthchild | Crystal Lady | Airy, nature mystic |
| Dr. Von Stuffington | Marine Biologist | Stuffy, fish-obsessed expert |

## Tech Stack

- React 18 + Vite
- Web Speech API (voice acting)
- Web Audio API (music + SFX)
- SVG character portraits & backgrounds
- Zero backend dependencies

## Credits

- Game script & design by Davis D AI Wiz
