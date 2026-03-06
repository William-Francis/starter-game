import { Server } from 'socket.io';
import { CONFIG, POWERUP_TYPES, PowerupType } from '../shared/constants';
import {
  ServerPlayer,
  ServerFood,
  ServerPowerup,
  GameStatePayload,
  ClientPlayer,
  ClientFood,
  ClientPowerup,
  InputState,
  Vec2,
} from './types';

let foodIdCounter = 0;
let powerupIdCounter = 0;

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function randomSpawnPosition(players: Map<string, ServerPlayer>, foods: ServerFood[]): Vec2 {
  const margin = CONFIG.PLAYER_RADIUS * 3;
  for (let attempt = 0; attempt < 50; attempt++) {
    const pos: Vec2 = {
      x: randomInRange(margin, CONFIG.ARENA_WIDTH - margin),
      y: randomInRange(margin, CONFIG.ARENA_HEIGHT - margin),
    };
    // Check not inside a player or their tail
    let valid = true;
    for (const p of players.values()) {
      if (distance(pos, p.position) < CONFIG.PLAYER_RADIUS * 4) {
        valid = false;
        break;
      }
      for (const seg of p.tail) {
        if (distance(pos, seg) < CONFIG.PLAYER_RADIUS * 2) {
          valid = false;
          break;
        }
      }
      if (!valid) break;
    }
    if (valid) return pos;
  }
  // Fallback to truly random
  return {
    x: randomInRange(CONFIG.PLAYER_RADIUS, CONFIG.ARENA_WIDTH - CONFIG.PLAYER_RADIUS),
    y: randomInRange(CONFIG.PLAYER_RADIUS, CONFIG.ARENA_HEIGHT - CONFIG.PLAYER_RADIUS),
  };
}

function spawnFood(players: Map<string, ServerPlayer>, foods: ServerFood[]): void {
  while (foods.length < CONFIG.FOOD_TARGET_COUNT) {
    foods.push({
      id: foodIdCounter++,
      position: randomSpawnPosition(players, foods),
    });
  }
}

function spawnPowerups(
  players: Map<string, ServerPlayer>,
  powerups: ServerPowerup[]
): void {
  while (powerups.length < CONFIG.POWERUP_TARGET_COUNT) {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    powerups.push({
      id: powerupIdCounter++,
      type,
      position: randomSpawnPosition(players, []),
    });
  }
}

function computeTailFromHistory(history: Vec2[], score: number): Vec2[] {
  if (score === 0 || history.length === 0) return [];

  const segments: Vec2[] = [];
  let distAccum = 0;
  // Walk backwards through history, emitting a segment every TAIL_SEGMENT_SPACING px
  for (let i = history.length - 2; i >= 0 && segments.length < score; i--) {
    const a = history[i + 1];
    const b = history[i];
    const d = distance(a, b);
    distAccum += d;
    if (distAccum >= CONFIG.TAIL_SEGMENT_SPACING) {
      distAccum = 0;
      segments.push({ x: b.x, y: b.y });
    }
  }
  return segments;
}

function serializeState(
  players: Map<string, ServerPlayer>,
  foods: ServerFood[],
  powerups: ServerPowerup[]
): GameStatePayload {
  const clientPlayers: ClientPlayer[] = [];
  for (const p of players.values()) {
    clientPlayers.push({
      id: p.id,
      name: p.name,
      color: p.color,
      x: p.position.x,
      y: p.position.y,
      tail: p.tail,
      score: p.score,
      stunned: p.stunned,
      stunnedUntil: p.stunnedUntil,
      speedBoostUntil: p.speedBoostUntil,
      reversedUntil: p.reversedUntil,
    });
  }
  const clientFoods: ClientFood[] = foods.map((f) => ({
    id: f.id,
    x: f.position.x,
    y: f.position.y,
  }));
  const clientPowerups: ClientPowerup[] = powerups.map((p) => ({
    id: p.id,
    type: p.type,
    x: p.position.x,
    y: p.position.y,
  }));
  return { players: clientPlayers, foods: clientFoods, powerups: clientPowerups };
}

export function startGame(io: Server, players: Map<string, ServerPlayer>): void {
  const foods: ServerFood[] = [];
  const powerups: ServerPowerup[] = [];
  spawnFood(players, foods);
  spawnPowerups(players, powerups);

  let lastTick = Date.now();

  // ─── Game tick ──────────────────────────────────────────────────────────────
  setInterval(() => {
    const now = Date.now();
    const dt = (now - lastTick) / 1000; // seconds
    lastTick = now;

    // 1. Update each player
    for (const player of players.values()) {
      // Stun expiry — teleport to a new random position on recovery
      if (player.stunned && now >= player.stunnedUntil) {
        player.stunned = false;
        const newPos = randomSpawnPosition(players, foods);
        player.position = newPos;
        player.pathHistory = [{ ...newPos }];
        player.distanceTravelled = 0;
        player.tail = [];
        // Pick a fresh random facing direction
        const angle = Math.random() * Math.PI * 2;
        player.facing = { x: Math.cos(angle), y: Math.sin(angle) };
        // Brief immunity so they aren't immediately hit again
        player.spawnImmunityUntil = now + 1500;
      }

      if (player.stunned) continue;

      // Movement — always move in the last facing direction
      // Apply reversed controls if active
      const reversed = now < player.reversedUntil;
      const raw = player.input;
      const { up, down, left, right } = reversed
        ? { up: raw.down, down: raw.up, left: raw.right, right: raw.left }
        : raw;
      let vx = 0;
      let vy = 0;
      if (up) vy -= 1;
      if (down) vy += 1;
      if (left) vx -= 1;
      if (right) vx += 1;

      // If a key is held, update the facing direction — but never reverse into yourself.
      // If the intended direction's dot product with current facing is negative,
      // it would send the player backward into their own tail, so ignore it.
      const mag = Math.sqrt(vx * vx + vy * vy);
      if (mag > 0) {
        const nx = vx / mag;
        const ny = vy / mag;
        const dot = nx * player.facing.x + ny * player.facing.y;
        if (dot >= 0) {
          // Forward or perpendicular — allow the turn
          player.facing.x = nx;
          player.facing.y = ny;
        }
        // dot < 0 means the input is pointing backward — silently ignore it
      }

      // Always move — use facing when no keys are pressed
      {
        const speed = now < player.speedBoostUntil
          ? CONFIG.PLAYER_SPEED * CONFIG.POWERUP_SPEED_MULTIPLIER
          : CONFIG.PLAYER_SPEED;
        const dx = player.facing.x * speed * dt;
        const dy = player.facing.y * speed * dt;

        const prevX = player.position.x;
        const prevY = player.position.y;

        let newX = Math.max(
          CONFIG.PLAYER_RADIUS,
          Math.min(CONFIG.ARENA_WIDTH - CONFIG.PLAYER_RADIUS, player.position.x + dx)
        );
        let newY = Math.max(
          CONFIG.PLAYER_RADIUS,
          Math.min(CONFIG.ARENA_HEIGHT - CONFIG.PLAYER_RADIUS, player.position.y + dy)
        );

        // Deflect facing off walls so the player doesn't get stuck in a corner
        if (newX === CONFIG.PLAYER_RADIUS || newX === CONFIG.ARENA_WIDTH - CONFIG.PLAYER_RADIUS) {
          player.facing.x *= -1;
        }
        if (newY === CONFIG.PLAYER_RADIUS || newY === CONFIG.ARENA_HEIGHT - CONFIG.PLAYER_RADIUS) {
          player.facing.y *= -1;
        }

        player.position.x = newX;
        player.position.y = newY;

        // Accumulate path history
        const moved = distance({ x: prevX, y: prevY }, player.position);
        player.distanceTravelled += moved;
        player.pathHistory.push({ x: player.position.x, y: player.position.y });

        // Trim history to limit memory: keep enough for max theoretical tail
        const maxHistory = (CONFIG.FOOD_TARGET_COUNT + 10) * CONFIG.TAIL_SEGMENT_SPACING * 2;
        if (player.pathHistory.length > maxHistory) {
          player.pathHistory.splice(0, player.pathHistory.length - maxHistory);
        }

        // Update tail
        player.tail = computeTailFromHistory(player.pathHistory, player.score);
      }
    }

    // 2. Food collection
    for (const player of players.values()) {
      if (player.stunned) continue;
      for (let i = foods.length - 1; i >= 0; i--) {
        if (
          distance(player.position, foods[i].position) <
          CONFIG.PLAYER_RADIUS + CONFIG.FOOD_RADIUS
        ) {
          foods.splice(i, 1);
          player.score += 1;
          player.tail = computeTailFromHistory(player.pathHistory, player.score);
        }
      }
    }

    // 3. Respawn food
    spawnFood(players, foods);

    // 4. Powerup collection
    for (const player of players.values()) {
      if (player.stunned) continue;
      for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        if (
          distance(player.position, pu.position) <
          CONFIG.PLAYER_RADIUS + CONFIG.POWERUP_RADIUS
        ) {
          powerups.splice(i, 1);
          if (pu.type === 'speed') {
            player.speedBoostUntil = now + CONFIG.POWERUP_SPEED_DURATION;
          } else if (pu.type === 'reverse') {
            player.reversedUntil = now + CONFIG.POWERUP_REVERSE_DURATION;
          } else if (pu.type === 'double-tail') {
            player.score = player.score * 2;
            player.tail = computeTailFromHistory(player.pathHistory, player.score);
          }
        }
      }
    }

    // Respawn powerups
    spawnPowerups(players, powerups);

    // 5. Tail collision detection
    for (const player of players.values()) {
      if (player.stunned) continue;
      if (now < player.spawnImmunityUntil) continue;

      let didHit = false;
      let tailOwner: ServerPlayer | null = null;

      outer: for (const other of players.values()) {
        const isSelf = other.id === player.id;
        // For own tail, skip the first 3 segments (they're always near the head)
        const tail = isSelf ? other.tail.slice(3) : other.tail;
        for (const seg of tail) {
          if (
            distance(player.position, seg) <
            CONFIG.PLAYER_RADIUS + CONFIG.TAIL_SEGMENT_RADIUS
          ) {
            didHit = true;
            tailOwner = isSelf ? null : other;
            break outer;
          }
        }
      }

      if (didHit) {
        // Award the tail owner half the colliding player's score (rounded up)
        if (tailOwner && player.score > 0) {
          const bonus = Math.ceil(player.score / 2);
          tailOwner.score += bonus;
          tailOwner.tail = computeTailFromHistory(tailOwner.pathHistory, tailOwner.score);
        }

        player.stunned = true;
        player.stunnedUntil = now + CONFIG.STUN_DURATION;
        player.score = 0;
        player.tail = [];
        player.pathHistory = [];
        player.distanceTravelled = 0;
        io.emit('stunned', { playerId: player.id });
      }
    }
  }, 1000 / CONFIG.TICK_RATE);

  // ─── State broadcast ─────────────────────────────────────────────────────────
  setInterval(() => {
    const state = serializeState(players, foods, powerups);
    io.emit('state', state);
  }, 1000 / CONFIG.BROADCAST_RATE);
}

export function createPlayer(
  id: string,
  name: string,
  color: string,
  players: Map<string, ServerPlayer>
): ServerPlayer {
  const position = randomSpawnPosition(players, []);
  // Pick a random initial facing direction
  const angle = Math.random() * Math.PI * 2;
  const player: ServerPlayer = {
    id,
    name: name.slice(0, CONFIG.MAX_PLAYER_NAME_LENGTH).replace(/[<>&"]/g, ''),
    color,
    position,
    input: { up: false, down: false, left: false, right: false },
    facing: { x: Math.cos(angle), y: Math.sin(angle) },
    score: 0,
    tail: [],
    pathHistory: [{ ...position }],
    distanceTravelled: 0,
    stunned: false,
    stunnedUntil: 0,
    spawnImmunityUntil: Date.now() + CONFIG.SPAWN_IMMUNITY_MS,
    speedBoostUntil: 0,
    reversedUntil: 0,
  };
  return player;
}

export { serializeState };
