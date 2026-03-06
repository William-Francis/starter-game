# Implementation Plan

A phased, step-by-step build order. Each phase produces a runnable checkpoint so progress can be verified before moving on.

---

## Phase 1 — Project Scaffolding & Dev Tooling

**Goal:** Empty project that compiles, runs, and serves a blank page.

### Steps

1. **Initialise the project**
   - `npm init -y`
   - Install dependencies: `express`, `socket.io`, `socket.io-client`
   - Install dev dependencies: `typescript`, `esbuild`, `@types/node`, `@types/express`, `tsx`, `concurrently`

2. **Configure TypeScript**
   - Create `tsconfig.json` with `strict: true`, targeting ES2020, module NodeNext.
   - Separate concern: server code compiled by `tsx`, client code bundled by `esbuild`.

3. **Create the project directory structure**

   ```
   src/
     server/
       index.ts
       game.ts
       types.ts
     client/
       index.html
       client.ts
       renderer.ts
       types.ts
     shared/
       constants.ts    # CONFIG object used by both server and client
   ```

4. **Minimal server (`src/server/index.ts`)**
   - Express app serving `src/client/index.html` and the esbuild client bundle.
   - Socket.io attached to the HTTP server.
   - Listens on port 3000.

5. **Minimal client (`src/client/index.html`)**
   - Blank page with a `<canvas>` element (hidden initially) and a placeholder join form.
   - Loads the bundled client JS.

6. **Dev scripts in `package.json`**
   - `dev` — runs server via `tsx --watch` and esbuild in watch mode concurrently.
   - `build` — production compile.

### Checkpoint

Run `npm run dev`, open `http://localhost:3000`, see the blank page with a join form. No errors in console.

---

## Phase 2 — Shared Types & Constants

**Goal:** All shared data structures and config values defined and importable by both server and client.

### Steps

1. **`src/shared/constants.ts`** — Define the `CONFIG` object:
   - Arena dimensions, radii, speeds, tick/broadcast rates, stun duration, food count, name length.

2. **`src/server/types.ts`** — Server-side types:
   - `ServerPlayer` — full mutable player state (id, name, color, position, velocity, tail, score, stunned, stunnedUntil, input).
   - `ServerFood` — id, position, radius.
   - `GameState` — `Map<string, ServerPlayer>`, `ServerFood[]`.

3. **`src/client/types.ts`** — Client-side types (lightweight, serialisable):
   - `ClientPlayer` — id, name, color, x, y, tail, score, stunned.
   - `ClientFood` — id, x, y.
   - `GameStatePayload` — `{ players: ClientPlayer[], foods: ClientFood[] }`.

4. **Socket event name constants** — Define event names (`join`, `input`, `joined`, `state`, `playerJoined`, `playerLeft`, `stunned`) as a shared enum or string constants.

### Checkpoint

Project still compiles with no errors. Types are importable from both server and client code.

---

## Phase 3 — Join Screen UI

**Goal:** A functional join form that captures name + color and emits a `join` event.

### Steps

1. **HTML form in `index.html`**
   - Text input for name (maxlength 16, required).
   - Color picker (`<input type="color">`) with a default value, or a row of preset color swatches.
   - "Play" button.

2. **Client join logic (`client.ts`)**
   - On form submit: connect to Socket.io, emit `join` with `{ name, color }`.
   - On receiving `joined` event: hide the form, show the canvas, store own `playerId`.

3. **Server join handler (`index.ts`)**
   - On `join` event: create a `ServerPlayer` at a random spawn position, add to game state.
   - Emit `joined` back to the joining client with their `playerId` and a snapshot of current game state.
   - Broadcast `playerJoined` to all other clients.

4. **Disconnect handler**
   - On socket disconnect: remove player from game state, broadcast `playerLeft`.

### Checkpoint

Open two browser tabs. Each can join with a name and color. Server logs show players joining/leaving. No game rendering yet.

---

## Phase 4 — Game Loop & Movement (Server)

**Goal:** Server-side game loop that processes input and moves players.

### Steps

1. **Input handling**
   - Client listens for `keydown`/`keyup` on W, A, S, D.
   - Maintains a local input state `{ up, down, left, right }`.
   - Emits `input` event to server whenever a key state changes.
   - Server stores each player's latest input state.

2. **Server game loop (`game.ts`)**
   - `setInterval` at `1000 / CONFIG.TICK_RATE` ms.
   - Each tick:
     a. For each player that is not stunned:
     - Compute velocity from input (normalize diagonal).
     - Update position: `pos += velocity * speed * deltaTime`.
     - Clamp to arena bounds (accounting for player radius).
       b. Check stun expiry: if `Date.now() >= stunnedUntil`, set `stunned = false`.

3. **State broadcast**
   - Separate interval at `1000 / CONFIG.BROADCAST_RATE` ms.
   - Serialize game state (players + foods) into `GameStatePayload`.
   - Emit `state` to all connected clients.

### Checkpoint

Join with two tabs. Press WASD — server logs show position changing. State events are received by clients (verify in browser console). Still no rendering.

---

## Phase 5 — Canvas Rendering (Client)

**Goal:** Players see themselves and other players as colored circles moving around the arena.

### Steps

1. **Canvas setup (`renderer.ts`)**
   - Resize canvas to fill the window (`window.innerWidth × innerHeight`).
   - Handle `resize` event.

2. **Camera system**
   - Translate the canvas context so the local player is always centered.
   - Calculate offset: `cameraX = localPlayer.x - canvas.width / 2`, same for Y.

3. **Background / arena rendering**
   - Draw a filled rectangle for the arena bounds (light grey or subtle grid).
   - Draw arena border.

4. **Player rendering**
   - For each player in the latest state:
     - Draw the player circle at their position in their chosen color.
     - Draw the player's name above the circle (white text with dark outline for readability).
     - If stunned: render at 50% opacity.

5. **Render loop**
   - `requestAnimationFrame` loop.
   - On each frame: clear canvas, apply camera transform, draw arena, draw players.

6. **State interpolation (basic)**
   - Store the two most recent state snapshots.
   - Lerp player positions between them based on elapsed time since last update.
   - This smooths the 20 Hz updates to 60 fps visually.

### Checkpoint

Join with two tabs, see colored circles with names. Move with WASD and see smooth movement. Camera follows local player. Arena boundaries visible.

---

## Phase 6 — Food Spawning & Collection

**Goal:** Green food circles appear on the map and can be collected by players.

### Steps

1. **Food spawning (server `game.ts`)**
   - On game init and each tick: if `foods.length < CONFIG.FOOD_TARGET_COUNT`, spawn food at random valid positions.
   - Validate spawn position: not inside any player circle or tail segment.
   - Each food gets a unique incrementing ID.

2. **Food collection (server `game.ts`)**
   - Each tick, for each player (not stunned):
     - Check distance to each food item.
     - If overlap (distance < `PLAYER_RADIUS + FOOD_RADIUS`): remove food, increment player score.
     - Flag that the tail should grow by one segment.

3. **Food rendering (client `renderer.ts`)**
   - Draw each food as a small green circle (`#22c55e`) at its position.
   - Render food before players so players draw on top.

### Checkpoint

Food appears scattered across the arena. Walking over food makes it disappear and the player's score increases. New food spawns to replace collected food. Visible from all connected clients.

---

## Phase 7 — Tail System

**Goal:** Players grow a tail of trailing circles as they collect food.

### Steps

1. **Tail tracking (server `game.ts`)**
   - Maintain a `pathHistory: {x, y}[]` for each player — append current position each tick.
   - Desired tail length = `score * CONFIG.TAIL_SEGMENT_SPACING` positions in history.
   - Trim `pathHistory` to `maxLength = desiredTailLength + buffer`.
   - Derive tail segment positions by sampling `pathHistory` at intervals of `TAIL_SEGMENT_SPACING` distance.

2. **Tail serialization**
   - Include tail segment positions in the `state` broadcast under each player's data.
   - Only send `{ x, y }[]` — no extra metadata.

3. **Tail rendering (client `renderer.ts`)**
   - For each player, draw tail segments as circles (radius `TAIL_SEGMENT_RADIUS`) in the player's color, slightly transparent or with a subtle stroke.
   - Draw tail before the head so the head renders on top.

### Checkpoint

Collect food, see a snake-like tail forming behind the player. Tail follows the exact path the player took. Tail visible to all clients. Multiple segments visible with 3+ food collected.

---

## Phase 8 — Tail Collision & Stun

**Goal:** Hitting another player's tail stuns you and clears your tail.

### Steps

1. **Collision detection (server `game.ts`)**
   - Each tick, for each non-stunned player:
     - Check distance from this player's head to every tail segment of every **other** player.
     - If overlap (distance < `PLAYER_RADIUS + TAIL_SEGMENT_RADIUS`): trigger collision.

2. **Collision response**
   - Set the colliding player's `stunned = true`.
   - Set `stunnedUntil = Date.now() + CONFIG.STUN_DURATION`.
   - Clear the player's `tail`, `pathHistory`, and reset `score` to 0.
   - Emit `stunned` event to all clients with the affected `playerId`.

3. **Stun recovery (server)**
   - Already handled in Phase 4 tick: check `Date.now() >= stunnedUntil` and clear stun state.

4. **Stun visual (client `renderer.ts`)**
   - When a player is stunned:
     - Render at 50% opacity.
     - Show a countdown timer above the player (seconds remaining).
     - Optionally flash/pulse the circle.

### Checkpoint

Player A has a tail. Player B runs into Player A's tail. Player B freezes, their tail disappears, and they show as semi-transparent with a countdown. After 4 seconds, Player B can move again. Player A is unaffected.

---

## Phase 9 — HUD & Scoreboard

**Goal:** In-game UI showing scores and player information.

### Steps

1. **Scoreboard (`renderer.ts`)**
   - Draw an overlay in the top-right corner of the canvas (fixed to screen, not world).
   - List all players sorted by score descending: `Name — Score`.
   - Highlight the local player's row.
   - Style: semi-transparent dark background, white text.

2. **Player count**
   - Small text in the top-left: `Players: N`.

3. **Stun countdown**
   - Rendered above stunned players in world space (already added in Phase 8).
   - Format: `"3.2s"` counting down.

### Checkpoint

Scoreboard updates live as food is collected. Player count updates on join/leave. All info visible without cluttering gameplay.

---

## Phase 10 — Polish & Edge Cases

**Goal:** Tighten up the experience and handle edge cases.

### Steps

1. **Spawn protection**
   - New players spawn with 2 seconds of stun immunity (cannot be stunned immediately after joining).

2. **Name sanitization**
   - Strip HTML/special characters from player names.
   - Truncate to `MAX_PLAYER_NAME_LENGTH`.
   - Reject empty names.

3. **Disconnect cleanup**
   - Ensure disconnected players are fully removed from all data structures.
   - Their tail segments should not linger.

4. **Performance guard**
   - Cap maximum number of players (e.g. 20).
   - If food spawn validation loops too long, fall back to random placement.

5. **Visual polish**
   - Smooth canvas rendering (anti-aliasing).
   - Arena boundary styling (darker border, out-of-bounds area greyed out).
   - Slight shadow or glow on player circles.

6. **Reconnection UX**
   - If the socket disconnects, show a "Disconnected — click to rejoin" overlay.

### Checkpoint

Play-test with 3–4 browser tabs. Join, move, collect food, collide, get stunned, recover, disconnect, rejoin — all work cleanly.

---

## Summary: Build Order at a Glance

| Phase | What                       | Key Deliverable                        |
| ----- | -------------------------- | -------------------------------------- |
| 1     | Scaffolding & tooling      | Project runs, serves blank page        |
| 2     | Shared types & constants   | Type-safe contracts defined            |
| 3     | Join screen                | Players can connect with name + color  |
| 4     | Game loop & movement       | Server moves players, broadcasts state |
| 5     | Canvas rendering           | Players visible and moving on screen   |
| 6     | Food spawning & collection | Food appears and can be collected      |
| 7     | Tail system                | Collected food grows a trailing tail   |
| 8     | Collision & stun           | Tail hits cause 4s stun + tail loss    |
| 9     | HUD & scoreboard           | Scores and player info displayed live  |
| 10    | Polish & edge cases        | Production-ready, robust experience    |

Each phase builds directly on the previous one. No phase should take more than ~30–60 minutes of focused implementation.
