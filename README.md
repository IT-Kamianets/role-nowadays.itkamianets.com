# Role Nowadays

> Browser-based social deduction game inspired by classic Mafia — cinematic role reveals, real-time multiplayer, 20 unique roles, zero install.

**Live:** [role-nowadays.itkamianets.com](https://role-nowadays.itkamianets.com)

---

## What is this?

Role Nowadays is a mobile-first Mafia game built for the web. Open a link, create a private room, share the PIN — and you're playing in seconds. No app store, no accounts, no waiting.

The server owns all game state. Roles are assigned secretly on the backend, night actions are resolved automatically, and phase transitions are broadcast to every device simultaneously. Players can't cheat — every action is validated server-side before it takes effect.

---

## Cinematic Experience

The game opens with a **mandatory video sequence** that cannot be skipped:

1. `day-to-night.mp4` plays fullscreen when the first night begins
2. After the video: your role card appears face-down in the center of the screen
3. The card flips to reveal your role — animated, unskippable
4. The card flies to the right column as the split-screen layout slides in simultaneously
5. Phase transitions (Night → Day → Night) trigger the corresponding video every round

All animations are CSS keyframe-based and work on iOS Safari and Android Chrome with `muted playsinline` autoplay.

---

## Gameplay Loop

```
Lobby → Night 1 (video + role reveal) → Day → Voting → Night 2 → ... → End
```

**Night** — each role performs their secret action:
- Mafia votes on a kill target
- Doctor picks someone to protect
- Detective checks a player's alignment
- Mafia team has a private chat visible only to them

**Day** — all players discuss publicly. A live chat is available to everyone.

**Voting** — players vote to eliminate a suspect. The highest vote count wins. In case of a tie, no one is eliminated. Mayor's vote counts double.

**End** — the game ends when one faction achieves its win condition. All roles are revealed.

---

## Win Conditions

| Faction | Wins when... |
|---------|-------------|
| City | All mafia members are eliminated |
| Mafia | Mafia count equals or exceeds city count |
| Jester | Gets eliminated by city vote |
| Executioner | Secret target is eliminated by city vote |
| Survivor | Alive at the end of the game |
| Serial Killer | Last one standing |
| Arsonist | Ignites enough doused players to win solo |

---

## Roles

### City

| Role | Ability |
|------|---------|
| Villager | No special ability. Trust your reads. |
| Detective | Investigates one player per night — learns if they're mafia or not |
| Doctor | Protects one player per night from elimination |
| Bodyguard | Guards a player — dies in their place if attacked |
| Sheriff | Investigates one player — learns mafia vs. city |
| Tracker | Follows a target and sees who they visited |
| Watcher | Guards a target and sees everyone who visited them |
| Priest | Shields a player from manipulation and role-blocking |
| Mayor | Vote counts twice during elimination |

### Mafia

| Role | Ability |
|------|---------|
| Mafia | Votes with the team to eliminate a player each night |
| Godfather | Leads the mafia. Appears innocent to Detective and Sheriff |
| Consigliere | Learns the exact role of any player each night |
| Roleblocker | Prevents a player from using their night action |
| Poisoner | Poisons a target — they die two rounds later |
| Framer | Makes a player appear as mafia to investigators |

### Neutral

| Role | Ability |
|------|---------|
| Jester | Win by tricking the city into voting you out |
| Executioner | Has a secret target — win if they're voted out |
| Survivor | No ability. Just stay alive. |
| Serial Killer | Kills one player per night independently |
| Arsonist | Douses players with gasoline, then ignites them all at once |

---

## Game Modes

### Classic
A balanced setup for 4–10 players. Roles: Villager, Detective, Doctor, Mafia. No complex interactions — pure deduction.

### Extended
Scales dynamically from 4 to 15+ players. Role composition changes by player count:

| Players | Notable additions |
|---------|-------------------|
| 4–5 | Mafia, Detective, Doctor |
| 6–7 | + Godfather, Bodyguard |
| 8–9 | + Second Mafia, Jester |
| 10–11 | + Consigliere, Sheriff, Survivor |
| 12+ | + Third Mafia, Roleblocker, Tracker |

### Custom
The host manually picks how many of each role to include. Any combination is valid — the game engine handles edge cases automatically.

---

## Features

- **Zero install** — runs in any modern mobile browser
- **Private rooms** with PIN codes
- **Real-time sync** via 3-second polling (no WebSocket dependency)
- **Cinematic phase transitions** — fullscreen video between night and day
- **Role reveal animation** — card flip sequence on game start, unskippable
- **Split-screen header** — current phase + timer + your role card, always visible
- **Mafia team chat** — private night chat visible only to mafia members
- **Role-specific night actions** — each role has a unique UI and target list
- **Vote tracking** — live progress: see who has voted and who hasn't
- **Auto phase transitions** — timers automatically advance to the next phase
- **Mayor double-vote** — vote weight system built into tallying
- **Arsonist ignite mechanic** — accumulate doused players, then choose when to ignite
- **Executioner secret target** — assigned at game start, checked every vote resolution
- **Poisoner delayed kill** — poison resolves after 2 rounds automatically
- **Event log** — full game history visible during and after the game
- **Win screen** — shows winner, all roles, and full game log
- **Capacitor-ready** — wrappable as a native Android/iOS app

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 21 (standalone components, lazy-loaded routes) |
| Styling | Tailwind CSS v3 |
| Animations | CSS keyframes (`@keyframes cardFlyRight`, `phaseSlideIn`, `roleCardAppear`) |
| Mobile wrapper | Capacitor (`com.itkamianets.rolenow`) |
| Backend | REST API at `api.webart.work` |
| Realtime | Polling every 3 seconds via RxJS `interval + switchMap` |
| CI/CD | GitHub Actions → `gh-pages` branch |
| Hosting | GitHub Pages + custom domain via CNAME |

---

## Project Structure

```
src/app/
├── pages/
│   ├── home/              # Game list — join public or private games, live filter
│   ├── create-game/       # Mode picker, player count, privacy, custom role builder
│   └── gameplay/          # Full game UI: phases, role reveal, timers, chat, voting
├── models/
│   ├── game.model.ts
│   ├── player.model.ts
│   └── role.model.ts
└── services/
    ├── game.service.ts              # All API calls: games, actions, messages, votes
    ├── classic-mafia.service.ts     # Classic mode: role assign, resolve night, check win
    └── extended-mafia.service.ts    # Extended mode: 20 roles, complex resolution logic

public/
├── card-*.jpg             # Role card images (21 cards including back)
├── day-to-night.mp4       # Phase transition video: day → night
└── night-to-day.mp4       # Phase transition video: night → day
```

---

## Game State Machine

All state lives in `game.data` on the server. The client polls every 3 seconds and reacts to phase changes:

```
lobby
  └─ start() ──► night (round 1)
                  └─ timer end ──► day
                                    └─ timer end ──► voting
                                                      └─ timer end ──► night (round N)
                                                                        └─ win condition ──► finished
```

Phase transitions are triggered by the **game creator's client** — the creator's timer fires the API call to advance the phase. All other clients observe the change on next poll.

---

## Development

```bash
npm install
npx ng serve        # dev server at localhost:4200
```

> The app connects to the live API at `api.webart.work`. CORS is restricted to the production domain — game actions won't work on localhost. Use the deployed site for full testing, or update `environment.ts` to point to a local API instance.

---

## Build & Deploy

```bash
npx ng build        # outputs to dist/role-nowadays/browser
npx cap sync        # sync assets to Capacitor (Android/iOS)
```

Push to `master` → GitHub Actions builds → deploys to `gh-pages` branch → served at the custom domain via CNAME.

The CI pipeline:
1. `npm ci` + `npm run build`
2. Copies `CNAME` and `index.html → 404.html` (SPA fallback for GitHub Pages)
3. Force-pushes `dist/role-nowadays/browser` to `gh-pages` via SSH deploy key

---

## Architecture Notes

- **Server-driven state** — the client is a thin display layer. All game logic (role resolution, win checks, vote tallying) runs in Angular services that mirror what the server stores.
- **No WebSockets** — polling every 3s is intentional. Keeps infrastructure simple and avoids connection state issues on mobile browsers.
- **Night timer is frozen** during the role reveal animation sequence — the timer display shows full duration until the overlay is dismissed, so players aren't punished for watching the animation.
- **Creator acts as coordinator** — phase advancement is sent by the creator's client only. All other clients are read-only on timing.
- **Tailwind v3 only** — v4 is incompatible with `@angular/build:application`. Do not upgrade.
