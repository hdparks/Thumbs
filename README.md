# Thumbs

A P2P browser-based one-button fighting game built with React and PeerJS.

## Overview

Thumbs is a real-time multiplayer thumb war game where two players compete by pressing/tapping a single button. The game uses WebRTC (via PeerJS) for peer-to-peer communication, meaning no central server is required—players connect directly to each other.

## How It Works

1. **Host** creates a room (no URL parameters)
2. **Joiner** opens the host's room URL with `?room=<peerId>`
3. Players connect via WebRTC and compete

### Game Mechanics

- **Touching**: Hold down to "touch" the opponent
- **Pinning**: If you touch while opponent is not touching, you pin them
- **Health Drain**: While pinned, your health decreases; pinner's health increases
- **Escape**: Tap rapidly (5 times) to break free from a pin
- **Win**: First to reduce opponent's health to 0 wins
- **Match**: First to 3 wins takes the match

## Current Architecture

```
src/
├── App.jsx                    # Main app, routing between Connection/GameCanvas
├── components/
│   ├── Connection.jsx          # Room creation/joining UI
│   ├── GameCanvas.jsx          # Game container with rollback netcode
│   ├── HealthBar.jsx           # Player health display
│   └── Thumb.jsx               # Touch/button component
├── engine/
│   ├── gameEngine.js          # Game state management
│   ├── inputHandler.js        # Input processing
│   ├── networkLayer.js         # P2P input buffering
│   ├── render.js               # Canvas rendering
│   └── rollbackManager.js      # Rollback netcode (integrated)
├── hooks/
│   └── usePeer.js              # PeerJS wrapper for P2P connections
└── tests/
    ├── gameEngine.test.js
    └── rollback.test.js
```

### Network Model

- **Rollback netcode**: Client-side prediction with server reconciliation
- **Input delay**: 2 frames to reduce rollback frequency
- **Client**: Runs predicted game state locally, reconciles on remote input
- **Host**: Authoritative, broadcasts confirmed state

### Game Constants

| Constant | Value |
|----------|-------|
| TICK_RATE | 16ms (physics), 100ms (client tick) |
| STARTING_HEALTH | 15 |
| MAX_HEALTH | 20 |
| ESCAPE_TAPS_NEEDED | 5 |

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **P2P**: PeerJS (WebRTC)
- **Testing**: Vitest + Playwright

## Development

```bash
npm install
npm run dev     # Start dev server
npm run build   # Production build
npm run preview # Preview production build
npm run test    # Run tests
```

## Known Issues / Technical Debt

- **Debug logging**: Console.logs throughout code need cleanup
- **Limited mobile support**: Touch events work but UI not optimized for mobile
- **No match system**: Just individual games, no best of 3/5

## Roadmap Ideas

- Mobile-friendly UI with proper touch handling
- Match system (best of 3/5)
- Character/thumb skins
- Sound effects
- Leaderboards
- Spectator mode
