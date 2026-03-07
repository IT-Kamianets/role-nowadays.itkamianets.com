# Role Nowadays

> Mobile-first social deduction game inspired by classic Mafia — play with friends in real time, no app install needed.

**Live:** [role-nowadays.itkamianets.com](https://role-nowadays.itkamianets.com)

---

## What is this?

Role Nowadays is a browser-based multiplayer Mafia game designed for mobile. Create a private room, share the PIN, and play with friends in seconds. The server drives all game state — roles are assigned secretly, night actions resolved automatically, and phase transitions happen in real time across all devices.

---

## Gameplay

Each game alternates between two phases:

**Night** — special roles act in secret:
- Mafia selects a target to eliminate
- Doctor protects a player
- Detective investigates a player's alignment

**Day** — all players discuss, then vote. The player with the most votes is eliminated.

The game ends when:
- All mafia are eliminated → **Village wins**
- Mafia count equals or exceeds villagers → **Mafia wins**

### Roles (Classic mode)

| Role | Team | Ability |
|------|------|---------|
| Villager | Village | No special ability |
| Detective | Village | Investigates one player per night |
| Doctor | Village | Protects one player per night |
| Mafia | Mafia | Votes to eliminate a player each night |

---

## Features

- Real-time multiplayer via polling (no WebSocket dependency)
- Role reveal animation on game start
- Phase transition videos (Night ↔ Day)
- Split-screen header: current phase + your role card, always visible
- Private games with PIN code
- Mafia night chat
- Detective result reveal
- Vote tracking with live progress
- Works on mobile browsers, installable via Capacitor

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21 (standalone components) |
| Styling | Tailwind CSS v3 |
| Mobile wrapper | Capacitor (`com.itkamianets.rolenow`) |
| Backend | REST API at `api.webart.work` |
| Hosting | GitHub Pages (custom domain via CNAME) |

---

## Project Structure

```
src/app/
├── pages/
│   ├── home/           # Game list, filters, join
│   ├── create-game/    # Mode selection, player count, privacy
│   └── gameplay/       # Full game UI — phases, role, timers, chat, voting
├── components/
│   └── game-card/      # Game list card component
├── models/             # game.model.ts, player.model.ts, role.model.ts
└── services/
    ├── game.service.ts          # API calls (games, actions, messages)
    └── classic-mafia.service.ts # Game logic (role assignment, resolve night/vote, win check)

public/                 # Static assets (card images, transition videos)
```

---

## Development

```bash
npm install
npx ng serve       # dev server at localhost:4200
```

> Note: the app connects to the live API (`api.webart.work`). CORS is restricted to the production domain, so game actions won't work on localhost — use the deployed site for full testing.

---

## Build & Deploy

```bash
npx ng build       # outputs to dist/role-nowadays/browser
npx cap sync       # sync to Capacitor (mobile)
```

Deploy is automatic via GitHub Actions on push to `master` → GitHub Pages.
