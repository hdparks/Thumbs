# AGENTS.md - Development Guidelines for thumbs

## Project Overview

This is a React + Vite P2P thumb war game using PeerJS for real-time multiplayer. The app allows two players to connect via WebRTC and compete in a thumb war game with health mechanics and escape tap mechanics.

## Build & Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Testing

Playwright is installed but not configured. To add tests:
```bash
# Install Playwright browsers
npx playwright install

# Run tests (add test scripts to package.json)
npx playwright test
```

## Code Style Guidelines

### General Conventions

- Use React functional components with hooks
- Use named exports for components and hooks
- Keep components focused and modular
- Use `useCallback` for functions passed as props to prevent unnecessary re-renders
- Use `useRef` for mutable values that don't trigger re-renders
- Use `useState` for component-local state

### Imports

Order imports as follows:
1. React hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
2. External libraries (`peerjs`)
3. Local components/hooks (relative paths)

```javascript
import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import { HealthBar } from './HealthBar';
import { Thumb } from './Thumb';
```

### Formatting

- Use 2 spaces for indentation
- Opening braces on same line as function/component declaration
- Use semicolons at end of statements
- Use template literals for string interpolation
- Use early returns to avoid deeply nested conditionals

### Naming Conventions

- **Components**: PascalCase (e.g., `Game`, `Connection`, `Thumb`)
- **Hooks**: camelCase with "use" prefix (e.g., `usePeer`, `useGameState`)
- **Props**: camelCase
- **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `TICK_RATE`, `MAX_HEALTH`)
- **Files**: PascalCase for components (e.g., `Game.jsx`), camelCase for hooks (e.g., `usePeer.js`)

### Types

This is a plain JavaScript project (no TypeScript). When adding new code:
- Add PropTypes for component props if type safety is needed
- Document expected data structures in comments
- Use meaningful variable names to convey intent

### State Management

- Use `useState` for local component state
- Use `useEffect` for side effects (subscriptions, timers, peer connections)
- Lift state to parent components when needed for sibling communication
- The `usePeer` hook manages P2P connection state

### Error Handling

- Use `console.error` for errors, `console.log` for debugging
- Store errors in state to display to users when appropriate
- The `usePeer` hook captures and stores PeerJS errors in `error` state

### P2P Communication

- Use `sendData` from `usePeer` to send messages to other player
- Data messages should have a `type` field for routing:
  ```javascript
  { type: 'stateUpdate', state: gameState }
  ```
- Host is responsible for game state and sends `stateUpdate` messages
- Client receives state updates and syncs local state

### Tailwind CSS

- Use utility classes for styling
- Common patterns:
  - Flexbox: `flex flex-col items-center gap-4`
  - Padding/margin: `p-4`, `m-2`
  - Colors: `bg-green-600`, `text-white`
  - Interactive: `hover:bg-green-500`, `active:shadow-none`

### Game State Structure

```javascript
{
  gameState: 'idle' | 'playing' | 'p1Win' | 'p2Win',
  p1: { health, isTouching, isPinned, escapeTaps, wins },
  p2: { health, isTouching, isPinned, escapeTaps, wins },
  winner: null | 'p1' | 'p2'
}
```

### Important Implementation Details

- The host (player who creates the room) manages all game logic
- Non-host clients receive state updates and render accordingly
- Ticks run every 100ms (TICK_RATE) to process health changes
- Players need 5 escape taps to break free when pinned
- Health drains from a player while pinned
