# Game Specification: Multiplayer Snake-like Arena

## Overview

A browser-based, real-time multiplayer top-down game where players control colored circles, collect food to grow a tail, and compete by colliding with other players' tails to stun them.

---

## Tech Stack

| Layer    | Technology                |
| -------- | ------------------------- |
| Server   | Node.js + TypeScript      |
| Realtime | Socket.io                 |
| Client   | HTML5 Canvas + TypeScript |
| Build    | esbuild (or ts-node)      |

---

## Game Flow

### 1. Lobby / Join Screen

- Player is presented with a simple form:
  - **Name** — text input (required, max 16 characters)
  - **Color** — color picker or preset palette (e.g. red, blue, yellow, purple, orange, pink)
- On submit, the client connects via Socket.io and the player enters the game world.

### 2. Game World

- A single shared 2D arena (e.g. 2000 × 2000 units) rendered on an HTML5 `<canvas>`.
- The camera follows the local player, keeping them centered on screen.
- The visible viewport is the size of the browser window.
- A subtle grid or background pattern indicates the play area boundaries.

### 3. Gameplay Loop

- Players move continuously in response to held keys.
- Food spawns randomly across the arena at regular intervals.
- Players collect food by overlapping with it.
- Collected food extends the player's tail.
- Colliding with another player's tail causes a penalty.

---

## Entities

### Player

| Property     | Details                                                  |
| ------------ | -------------------------------------------------------- |
| id           | Unique socket ID                                         |
| name         | Chosen display name (max 16 chars)                       |
| color        | Chosen color (hex string)                                |
| position     | `{ x: number, y: number }` — center of the circle        |
| radius       | Fixed size, e.g. 20px                                    |
| velocity     | Current movement vector derived from input               |
| speed        | Constant movement speed, e.g. 200 units/sec              |
| tail         | Array of `{ x, y }` positions representing tail segments |
| score        | Number of food currently held (= tail length)            |
| stunned      | Boolean — `true` while the player cannot move            |
| stunnedUntil | Timestamp when stun ends                                 |

### Food

| Property | Details                                      |
| -------- | -------------------------------------------- |
| id       | Unique identifier (UUID or incrementing int) |
| position | `{ x: number, y: number }`                   |
| radius   | Smaller than player, e.g. 8px                |
| color    | Always green (`#22c55e`)                     |

---

## Controls

| Key | Action     |
| --- | ---------- |
| W   | Move up    |
| A   | Move left  |
| S   | Move down  |
| D   | Move right |

- Multiple keys can be held simultaneously for diagonal movement.
- Diagonal movement should be normalized so speed is consistent.
- While **stunned**, all input is ignored and the player cannot move.

---

## Core Mechanics

### Movement

- The server runs a game loop at a fixed tick rate (e.g. 60 Hz / ~16ms).
- Each tick the server updates every player's position based on their current input.
- Players are clamped to the arena boundaries.
- Tail segments follow the player's previous positions, spaced evenly (e.g. every 20px of travel).

### Food Spawning

- The server maintains a target number of food items on the map (e.g. 50).
- When food count drops below the target, new food spawns at random positions within the arena.
- Food does not spawn inside a player or their tail.

### Food Collection

- When a player's circle overlaps a food circle (distance between centers < sum of radii), the food is collected.
- The food is removed from the world.
- The player's tail grows by one segment.
- The player's score increments by 1.

### Tail

- The tail is an array of point positions that trail behind the player.
- Each segment follows the path the player has taken (like a snake).
- Tail segments are rendered as circles the same color as the player but slightly smaller (e.g. radius 14px).
- On collection loss, the tail is cleared instantly.

### Collision with Another Player's Tail

- Checked each tick on the server.
- If a player's head circle overlaps any segment of **another** player's tail:
  - The colliding player becomes **stunned** for **4 seconds**.
  - The colliding player's tail is cleared (score resets to 0).
  - The colliding player's circle could flash or become semi-transparent to indicate stun.
- A player does **not** collide with their own tail.
- A stunned player cannot be stunned again (immunity while stunned).

---

## Networking

### Client → Server Events

| Event   | Payload                           | Description                   |
| ------- | --------------------------------- | ----------------------------- |
| `join`  | `{ name: string, color: string }` | Player requests to join       |
| `input` | `{ up, down, left, right }`       | Current key states (booleans) |

### Server → Client Events

| Event          | Payload                         | Description                        |
| -------------- | ------------------------------- | ---------------------------------- |
| `joined`       | `{ playerId, gameState }`       | Confirm join + initial full state  |
| `state`        | `{ players[], foods[] }`        | Periodic full game state broadcast |
| `playerJoined` | `{ id, name, color, position }` | New player notification            |
| `playerLeft`   | `{ id }`                        | Player disconnect notification     |
| `stunned`      | `{ playerId }`                  | A player was stunned               |

### State Sync Strategy

- The server is **authoritative** — all game logic runs server-side.
- The server broadcasts the full game state to all clients at ~20 Hz (every 50ms).
- The client performs simple interpolation/smoothing for rendering between state updates.
- Client-side prediction is optional for v1 (can be added later).

---

## UI / HUD

- **Scoreboard** — top-right corner, lists all players sorted by score: `Name: Score`.
- **Player label** — each player's name displayed above their circle.
- **Stun indicator** — stunned players appear semi-transparent with a countdown timer above them.
- **Player count** — small indicator showing current number of connected players.

---

## Project Structure

```
starter-game/
├── SPEC.md
├── readme.md
├── package.json
├── tsconfig.json
├── src/
│   ├── server/
│   │   ├── index.ts          # Express + Socket.io server setup
│   │   ├── game.ts           # Game loop, state management, physics
│   │   └── types.ts          # Shared type definitions
│   └── client/
│       ├── index.html         # Entry HTML with canvas + join form
│       ├── client.ts          # Socket.io client, input handling
│       ├── renderer.ts        # Canvas rendering logic
│       └── types.ts           # Client-side type definitions
└── dist/                      # Compiled output
```

---

## Configuration Constants

```typescript
const CONFIG = {
  ARENA_WIDTH: 2000,
  ARENA_HEIGHT: 2000,
  PLAYER_RADIUS: 20,
  TAIL_SEGMENT_RADIUS: 14,
  TAIL_SEGMENT_SPACING: 20, // pixels of travel between segments
  FOOD_RADIUS: 8,
  FOOD_TARGET_COUNT: 50,
  PLAYER_SPEED: 200, // units per second
  STUN_DURATION: 4000, // milliseconds
  TICK_RATE: 60, // server ticks per second
  BROADCAST_RATE: 20, // state broadcasts per second
  MAX_PLAYER_NAME_LENGTH: 16,
};
```

---

## MVP Scope (v1)

1. Join screen with name + color selection
2. Server-authoritative game loop with Socket.io
3. WASD movement with arena boundaries
4. Food spawning and collection
5. Tail that follows the player's path
6. Tail collision detection → 4-second stun + tail loss
7. Live scoreboard
8. Player join/leave handling

## Out of Scope (future)

- Client-side prediction / lag compensation
- Power-ups or abilities
- Multiple arenas / rooms
- Persistent leaderboard / accounts
- Mobile touch controls
- Sound effects / music
