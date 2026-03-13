import { Server } from 'socket.io';
import { CONFIG, POWERUP_TYPES, PowerupType } from '../shared/constants';
import {
  ServerPlayer,
  ServerFood,
  ServerPowerup,
  ServerBlackHole,
  ServerBullet,
  ServerMissile,
  ServerHook,
  GameStatePayload,
  ClientPlayer,
  ClientFood,
  ClientPowerup,
  ClientBlackHole,
  ClientBullet,
  ClientMissile,
  ClientHook,
  InputState,
  Vec2,
} from './types';

let foodIdCounter = 0;
let powerupIdCounter = 0;
let blackholeIdCounter = 0;
let bulletIdCounter = 0;
let hookIdCounter = 0;
let missileIdCounter = 0;

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

// Non-reverse, non-helmet, non-omni, non-jackbox, non-gun types used as disguises for the reverse powerup
const DISGUISE_TYPES: PowerupType[] = POWERUP_TYPES.filter((t) => t !== 'reverse' && t !== 'helmet' && t !== 'omni' && t !== 'jack-in-the-box' && t !== 'gun' && t !== 'minigun' && t !== 'icbm' && t !== 'hook');
// Types eligible for the regular random pool
const REGULAR_TYPES: PowerupType[] = POWERUP_TYPES.filter((t) => t !== 'helmet' && t !== 'omni' && t !== 'jack-in-the-box' && t !== 'gun' && t !== 'minigun' && t !== 'icbm' && t !== 'hook');

function spawnPowerups(
  players: Map<string, ServerPlayer>,
  powerups: ServerPowerup[]
): void {
  // Spawn regular powerups (non-helmet, non-omni)
  while (powerups.filter((p) => p.type !== 'helmet' && p.type !== 'omni').length < CONFIG.POWERUP_TARGET_COUNT) {
    const type = REGULAR_TYPES[Math.floor(Math.random() * REGULAR_TYPES.length)];
    const pu: ServerPowerup = {
      id: powerupIdCounter++,
      type,
      position: randomSpawnPosition(players, []),
      spawnedAt: Date.now(),
    };
    // Reverse powerups masquerade as a random non-reverse, non-helmet powerup
    if (type === 'reverse') {
      pu.disguiseType = DISGUISE_TYPES[Math.floor(Math.random() * DISGUISE_TYPES.length)];
    }
    powerups.push(pu);
  }

  // Spawn helmets separately to ensure they appear
  while (powerups.filter((p) => p.type === 'helmet').length < CONFIG.HELMET_TARGET_COUNT) {
    const pu: ServerPowerup = {
      id: powerupIdCounter++,
      type: 'helmet',
      position: randomSpawnPosition(players, []),
      spawnedAt: Date.now(),
    };
    powerups.push(pu);
  }

  // Spawn omni separately — rare, one at a time, never disguised
  while (powerups.filter((p) => p.type === 'omni').length < CONFIG.OMNI_TARGET_COUNT) {
    const pu: ServerPowerup = {
      id: powerupIdCounter++,
      type: 'omni',
      position: randomSpawnPosition(players, []),
      spawnedAt: Date.now(),
    };
    powerups.push(pu);
  }

  // Spawn jack-in-the-box separately — intentionally rare
  while (
    powerups.filter((p) => p.type === 'jack-in-the-box').length < CONFIG.JACKBOX_TARGET_COUNT &&
    Math.random() < CONFIG.JACKBOX_RESPAWN_CHANCE_PER_TICK
  ) {
    const pu: ServerPowerup = {
      id: powerupIdCounter++,
      type: 'jack-in-the-box',
      position: randomSpawnPosition(players, []),
      spawnedAt: Date.now(),
    };
    powerups.push(pu);
  }

  // Spawn gun pickups separately — one at a time
  while (powerups.filter((p) => p.type === 'gun').length < CONFIG.GUN_TARGET_COUNT) {
    const pu: ServerPowerup = {
      id: powerupIdCounter++,
      type: 'gun',
      position: randomSpawnPosition(players, []),
      spawnedAt: Date.now(),
    };
    powerups.push(pu);
  }

  // Spawn minigun pickups separately — one at a time
  while (powerups.filter((p) => p.type === 'minigun').length < CONFIG.MINIGUN_TARGET_COUNT) {
    const pu: ServerPowerup = {
      id: powerupIdCounter++,
      type: 'minigun',
      position: randomSpawnPosition(players, []),
      spawnedAt: Date.now(),
    };
    powerups.push(pu);
  }
  // Spawn hook pickups separately — one at a time
  while (powerups.filter((p) => p.type === 'hook').length < CONFIG.HOOK_TARGET_COUNT) {
    powerups.push({
      id: powerupIdCounter++,
      type: 'hook',
      position: randomSpawnPosition(players, []),
      spawnedAt: Date.now(),
    });
  }

  // Spawn ICBM pickups separately — one at a time
  while (powerups.filter((p) => p.type === 'icbm').length < CONFIG.ICBM_TARGET_COUNT) {
    powerups.push({
      id: powerupIdCounter++,
      type: 'icbm',
      position: randomSpawnPosition(players, []),
      spawnedAt: Date.now(),
    });
  }}

function spawnBlackHoles(
  players: Map<string, ServerPlayer>,
  blackholes: ServerBlackHole[]
): void {
  if (blackholes.length >= CONFIG.BLACKHOLE_TARGET_COUNT) return;

  // Margin from the edges for corner placement
  const margin = CONFIG.BLACKHOLE_RADIUS * 3;
  const cornerPositions: Vec2[] = [
    { x: margin, y: margin }, // top-left
    { x: CONFIG.ARENA_WIDTH - margin, y: margin }, // top-right
    { x: margin, y: CONFIG.ARENA_HEIGHT - margin }, // bottom-left
    { x: CONFIG.ARENA_WIDTH - margin, y: CONFIG.ARENA_HEIGHT - margin }, // bottom-right
  ];

  // Colors for paired holes (2 pairs)
  const pairColors = ['#ff1493', '#00d4ff']; // hot pink and cyan

  // Create 4 holes in the corners
  for (let i = 0; i < Math.min(cornerPositions.length, CONFIG.BLACKHOLE_TARGET_COUNT); i++) {
    const color = pairColors[Math.floor(i / 2) % pairColors.length];
    blackholes.push({
      id: blackholeIdCounter++,
      position: { ...cornerPositions[i] },
      radius: CONFIG.BLACKHOLE_RADIUS,
      color,
    });
  }

  // Pair up holes: hole 0 <-> hole 1, hole 2 <-> hole 3
  if (blackholes.length >= 2) {
    blackholes[0].paired = blackholes[1].id;
    blackholes[1].paired = blackholes[0].id;
  }
  if (blackholes.length >= 4) {
    blackholes[2].paired = blackholes[3].id;
    blackholes[3].paired = blackholes[2].id;
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
  powerups: ServerPowerup[],
  blackholes: ServerBlackHole[],
  bullets: ServerBullet[] = [],
  hooks: ServerHook[] = [],
  missiles: ServerMissile[] = []
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
      magnetUntil: p.magnetUntil,
      stamina: p.stamina,
      facingAngle: Math.atan2(p.facing.y, p.facing.x),
      invulnerableUntil: p.spawnImmunityUntil,
      hasHelmet: p.hasHelmet,
      zapCharge: p.zapCharge,
      zapStunnedUntil: p.zapStunnedUntil,
      gluedTo: p.gluedTo,
      gluedUntil: p.gluedUntil,
      hasGun: p.hasGun,
      gunAmmo: p.gunAmmo,
      gunType: p.gunType,
      hasHook: p.hasHook,
      hookedBy: p.hookedBy,
      hookedUntil: p.hookedUntil,
    });
  }
  const clientFoods: ClientFood[] = foods.map((f) => ({
    id: f.id,
    x: f.position.x,
    y: f.position.y,
  }));
  const clientPowerups: ClientPowerup[] = powerups.map((p) => ({
    id: p.id,
    type: p.disguiseType ?? p.type, // send disguise to clients so reverse looks like another powerup
    x: p.position.x,
    y: p.position.y,
  }));
  const clientBlackHoles: ClientBlackHole[] = blackholes.map((bh) => ({
    id: bh.id,
    x: bh.position.x,
    y: bh.position.y,
    radius: bh.radius,
    paired: bh.paired,
    color: bh.color,
  }));
  const clientBullets: ClientBullet[] = bullets.map((b) => ({
    id: b.id,
    ownerId: b.ownerId,
    x: b.position.x,
    y: b.position.y,
  }));
  const clientHooks: ClientHook[] = hooks.map((h) => ({
    id: h.id,
    ownerId: h.ownerId,
    x: h.position.x,
    y: h.position.y,
    latchedTo: h.latchedTo,
  }));
  const clientMissiles: ClientMissile[] = missiles.map((m) => ({
    id: m.id,
    ownerId: m.ownerId,
    x: m.position.x,
    y: m.position.y,
    angle: Math.atan2(m.velocity.y, m.velocity.x),
    targetId: m.targetId,
  }));
  return { players: clientPlayers, foods: clientFoods, powerups: clientPowerups, blackholes: clientBlackHoles, bullets: clientBullets, hooks: clientHooks, missiles: clientMissiles };
}

export function startGame(io: Server, players: Map<string, ServerPlayer>): void {
  const foods: ServerFood[] = [];
  const powerups: ServerPowerup[] = [];
  const blackholes: ServerBlackHole[] = [];
  const bullets: ServerBullet[] = [];
  const hooks: ServerHook[] = [];
  const missiles: ServerMissile[] = [];
  spawnFood(players, foods);
  spawnPowerups(players, powerups);
  spawnBlackHoles(players, blackholes);

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
      // Skip movement while zap-stunned
      if (now < player.zapStunnedUntil) continue;
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
        // Sprint: drains stamina while held; recharges when released
        const canSprint = player.input.sprint && player.stamina > 0;
        if (canSprint) {
          player.stamina = Math.max(0, player.stamina - CONFIG.SPRINT_DRAIN_RATE * dt);
        } else {
          player.stamina = Math.min(
            CONFIG.SPRINT_MAX_STAMINA,
            player.stamina + CONFIG.SPRINT_RECHARGE_RATE * dt
          );
        }
        // Prevent re-triggering a sprint until stamina recovers past the minimum threshold
        const isSprinting = canSprint && player.stamina > 0;

        const speed = (now < player.speedBoostUntil
          ? CONFIG.PLAYER_SPEED * CONFIG.POWERUP_SPEED_MULTIPLIER
          : CONFIG.PLAYER_SPEED) * (isSprinting ? CONFIG.SPRINT_SPEED_MULTIPLIER : 1);
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

          // Zap charge: count pellets toward threshold
          if (player.zapCharge < CONFIG.ZAP_PELLET_THRESHOLD) {
            player.zapCharge += 1;
            if (player.zapCharge >= CONFIG.ZAP_PELLET_THRESHOLD) {
              // Fully charged — find the nearest other non-stunned player and zap them
              let nearest: ServerPlayer | null = null;
              let nearestDist = Infinity;
              for (const other of players.values()) {
                if (other.id === player.id || other.stunned) continue;
                const d = distance(player.position, other.position);
                if (d < nearestDist) {
                  nearestDist = d;
                  nearest = other;
                }
              }
              if (nearest) {
                nearest.zapStunnedUntil = now + CONFIG.ZAP_STUN_DURATION;
                io.emit('zap-fired', { shooterId: player.id, targetId: nearest.id });
              }
              player.zapCharge = 0;
            }
          }
        }
      }
    }

    // 3. Respawn food
    spawnFood(players, foods);

    // 3b. Magnet: pull nearby food toward magnetic players
    for (const player of players.values()) {
      if (player.stunned || now >= player.magnetUntil) continue;
      for (const food of foods) {
        const dx = player.position.x - food.position.x;
        const dy = player.position.y - food.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.POWERUP_MAGNET_RADIUS && dist > 1) {
          const pullSpeed = CONFIG.PLAYER_SPEED * 1.5;
          const nx = dx / dist;
          const ny = dy / dist;
          food.position.x += nx * pullSpeed * dt;
          food.position.y += ny * pullSpeed * dt;
        }
      }
    }

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
            // Check if player has helmet protection
            if (player.hasHelmet) {
              player.hasHelmet = false;
              io.to(player.id).emit('helmet-protected', { disguisedAs: pu.disguiseType ?? 'speed' });
            } else {
              player.reversedUntil = now + CONFIG.POWERUP_REVERSE_DURATION;
              // Notify the player they've been scammed
              io.to(player.id).emit('scammed', { disguisedAs: pu.disguiseType ?? 'speed' });
            }
          } else if (pu.type === 'double-tail') {
            player.score = player.score * 2;
            player.tail = computeTailFromHistory(player.pathHistory, player.score);
            // Brief invulnerability so the larger tail doesn't immediately get them killed
            player.spawnImmunityUntil = Math.max(player.spawnImmunityUntil, now + 1000);
          } else if (pu.type === 'magnet') {
            player.magnetUntil = now + CONFIG.POWERUP_MAGNET_DURATION;
          } else if (pu.type === 'coin-flip') {
            const heads = Math.random() < 0.5;
            if (heads) {
              player.score += CONFIG.POWERUP_COIN_FLIP_WIN;
            } else {
              player.score = Math.max(0, player.score - CONFIG.POWERUP_COIN_FLIP_LOSS);
            }
            player.tail = computeTailFromHistory(player.pathHistory, player.score);
            io.to(player.id).emit('coin-flip-result', {
              heads,
              points: heads ? CONFIG.POWERUP_COIN_FLIP_WIN : CONFIG.POWERUP_COIN_FLIP_LOSS,
            });
          } else if (pu.type === 'helmet') {
            player.hasHelmet = true;
          } else if (pu.type === 'omni') {
            // All the good stuff — no reverse, no coin-flip gamble
            player.speedBoostUntil = now + CONFIG.POWERUP_SPEED_DURATION;
            player.magnetUntil = now + CONFIG.POWERUP_MAGNET_DURATION;
            player.hasHelmet = true;
            player.score = player.score * 2 + CONFIG.POWERUP_COIN_FLIP_WIN;
            player.tail = computeTailFromHistory(player.pathHistory, player.score);
            player.spawnImmunityUntil = Math.max(player.spawnImmunityUntil, now + 1000);
            io.to(player.id).emit('omni-collected');
          } else if (pu.type === 'jack-in-the-box') {
            // Find the nearest other non-stunned, non-glued player to glue to
            let nearest: ServerPlayer | null = null;
            let nearestDist = Infinity;
            for (const other of players.values()) {
              if (other.id === player.id || other.stunned || other.gluedTo || now < other.gluedUntil) continue;
              const d = distance(player.position, other.position);
              if (d < nearestDist) {
                nearestDist = d;
                nearest = other;
              }
            }
            if (nearest) {
              const expiresAt = now + CONFIG.JACKBOX_GLUE_DURATION;
              player.gluedTo = nearest.id;
              player.gluedUntil = expiresAt;
              nearest.gluedTo = player.id;
              nearest.gluedUntil = expiresAt;
              // Jack-in-the-box should not be lethal while active.
              player.spawnImmunityUntil = Math.max(player.spawnImmunityUntil, expiresAt + 1000);
              nearest.spawnImmunityUntil = Math.max(nearest.spawnImmunityUntil, expiresAt + 1000);
              io.emit('glued', { playerA: player.id, playerB: nearest.id, until: expiresAt });
            }
          } else if (pu.type === 'gun') {
            player.hasGun = true;
            player.gunAmmo = CONFIG.GUN_AMMO;
            player.gunType = 'gun';
            player.lastGunFiredAt = 0;
          } else if (pu.type === 'minigun') {
            player.hasGun = true;
            player.gunAmmo = CONFIG.MINIGUN_AMMO;
            player.gunType = 'minigun';
            player.lastGunFiredAt = 0;
          } else if (pu.type === 'icbm') {
            // Find the nearest enemy and launch a homing missile at them immediately
            let target: ServerPlayer | null = null;
            let targetDist = Infinity;
            for (const other of players.values()) {
              if (other.id === player.id || other.stunned) continue;
              const d = distance(player.position, other.position);
              if (d < targetDist) {
                targetDist = d;
                target = other;
              }
            }
            if (target) {
              const dx = target.position.x - player.position.x;
              const dy = target.position.y - player.position.y;
              const d = Math.sqrt(dx * dx + dy * dy) || 1;
              missiles.push({
                id: missileIdCounter++,
                ownerId: player.id,
                position: { x: player.position.x, y: player.position.y },
                velocity: { x: (dx / d) * CONFIG.ICBM_MISSILE_SPEED, y: (dy / d) * CONFIG.ICBM_MISSILE_SPEED },
                targetId: target.id,
                firedAt: now,
              });
              io.emit('icbm-launched', { ownerId: player.id, targetId: target.id });
            }
          } else if (pu.type === 'hook') {
            player.hasHook = true;
          }
        }
      }
    }

    // Expire old powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      if (now - powerups[i].spawnedAt >= CONFIG.POWERUP_LIFESPAN) {
        powerups.splice(i, 1);
      }
    }

    // Respawn powerups
    spawnPowerups(players, powerups);

    // 4c. Jack-in-the-box glue physics
    for (const player of players.values()) {
      if (!player.gluedTo) continue;

      const partner = players.get(player.gluedTo);
      if (!partner) {
        // Partner disconnected — unglue
        player.gluedTo = null;
        player.gluedUntil = now + 1000;
        continue;
      }

      if (now >= player.gluedUntil) {
        // Glue expired — blast both apart
        const dx = player.position.x - partner.position.x;
        const dy = player.position.y - partner.position.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / d;
        const ny = dy / d;
        // Each gets a strong facing kick away from the other
        player.facing = { x: nx, y: ny };
        partner.facing = { x: -nx, y: -ny };
        // Temporarily boost speed via short speedBoost
        player.speedBoostUntil = now + 600;
        partner.speedBoostUntil = now + 600;
        // Keep a short non-lethal grace period right after release.
        player.spawnImmunityUntil = Math.max(player.spawnImmunityUntil, now + 1000);
        partner.spawnImmunityUntil = Math.max(partner.spawnImmunityUntil, now + 1000);
        // Clear glue on both
        player.gluedTo = null;
        player.gluedUntil = now + 1500;
        partner.gluedTo = null;
        partner.gluedUntil = now + 1500;
        io.emit('unglued', { playerA: player.id, playerB: partner.id });
      } else {
        // Still glued — pull the two players toward each other's midpoint
        const midX = (player.position.x + partner.position.x) / 2;
        const midY = (player.position.y + partner.position.y) / 2;
        const pullStrength = 0.3; // lerp factor per tick
        player.position.x += (midX - player.position.x) * pullStrength;
        player.position.y += (midY - player.position.y) * pullStrength;
        partner.position.x += (midX - partner.position.x) * pullStrength;
        partner.position.y += (midY - partner.position.y) * pullStrength;
        // Clamp both to bounds
        for (const p of [player, partner]) {
          p.position.x = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.ARENA_WIDTH - CONFIG.PLAYER_RADIUS, p.position.x));
          p.position.y = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.ARENA_HEIGHT - CONFIG.PLAYER_RADIUS, p.position.y));
        }
      }
    }

    // 4b. Black hole teleportation
    for (const player of players.values()) {
      if (player.stunned) continue;
      if (now < player.teleportImmunityUntil) continue; // Skip if in teleport cooldown
      for (const bh of blackholes) {
        if (distance(player.position, bh.position) < bh.radius + CONFIG.PLAYER_RADIUS) {
          // Player entered this black hole!
          if (bh.paired !== undefined) {
            // Find the paired exit hole
            const exitHole = blackholes.find((h) => h.id === bh.paired);
            if (exitHole) {
              // Teleport player to the exit hole with safe positioning
              // Direction towards arena center to avoid corners
              const centerX = CONFIG.ARENA_WIDTH / 2;
              const centerY = CONFIG.ARENA_HEIGHT / 2;
              const towardsCenterX = centerX - exitHole.position.x;
              const towardsCenterY = centerY - exitHole.position.y;
              const dist = Math.sqrt(towardsCenterX * towardsCenterX + towardsCenterY * towardsCenterY);
              
              // Primary direction: towards center, with some random perpendicular offset
              const primaryAngle = Math.atan2(towardsCenterY, towardsCenterX);
              const perpAngle = primaryAngle + (Math.random() - 0.5) * Math.PI / 3; // ±30° from center
              
              const offset = CONFIG.PLAYER_RADIUS * 3.5; // Larger offset for safe clearance
              player.position = {
                x: exitHole.position.x + Math.cos(perpAngle) * offset,
                y: exitHole.position.y + Math.sin(perpAngle) * offset,
              };
              // Clamp to arena bounds
              player.position.x = Math.max(
                CONFIG.PLAYER_RADIUS,
                Math.min(CONFIG.ARENA_WIDTH - CONFIG.PLAYER_RADIUS, player.position.x)
              );
              player.position.y = Math.max(
                CONFIG.PLAYER_RADIUS,
                Math.min(CONFIG.ARENA_HEIGHT - CONFIG.PLAYER_RADIUS, player.position.y)
              );
              // Set facing direction towards exit direction for smooth movement
              player.facing.x = Math.cos(perpAngle);
              player.facing.y = Math.sin(perpAngle);
              // Clear path history and update tail
              player.pathHistory = [{ ...player.position }];
              player.distanceTravelled = 0;
              player.tail = computeTailFromHistory(player.pathHistory, player.score);
              // Set teleport immunity so they don't immediately bounce back
              player.teleportImmunityUntil = now + 1500; // 1.5 second cooldown
              // 1 second of collision immunity so they can find their bearings
              player.spawnImmunityUntil = Math.max(player.spawnImmunityUntil, now + 1000);
              break; // Don't process other holes this tick
            }
          }
        }
      }
    }

    // 5. Bullet movement, hit detection, and gun auto-fire

    // 5a. Move bullets and check hits
    const BULLET_LIFESPAN = 2500; // ms
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];

      // Expire old bullets
      if (now - bullet.firedAt > BULLET_LIFESPAN) {
        bullets.splice(i, 1);
        continue;
      }

      // Move
      bullet.position.x += bullet.velocity.x * dt;
      bullet.position.y += bullet.velocity.y * dt;

      // Despawn at arena walls
      if (
        bullet.position.x < 0 || bullet.position.x > CONFIG.ARENA_WIDTH ||
        bullet.position.y < 0 || bullet.position.y > CONFIG.ARENA_HEIGHT
      ) {
        bullets.splice(i, 1);
        continue;
      }

      // Hit detection
      let hit = false;
      for (const target of players.values()) {
        if (target.id === bullet.ownerId) continue;
        if (target.stunned) continue;
        if (now < target.gluedUntil) continue;
        if (now < target.spawnImmunityUntil) continue;
        if (distance(bullet.position, target.position) < CONFIG.PLAYER_RADIUS + CONFIG.GUN_BULLET_RADIUS) {
          hit = true;
          // Remove 1 score / tail segment
          if (target.score > 0) {
            target.score = Math.max(0, target.score - 1);
            target.tail = computeTailFromHistory(target.pathHistory, target.score);
          }
          // Knockback: redirect target's facing toward bullet direction and briefly boost speed
          const bSpeed = Math.sqrt(bullet.velocity.x ** 2 + bullet.velocity.y ** 2);
          if (bSpeed > 0) {
            target.facing.x = bullet.velocity.x / bSpeed;
            target.facing.y = bullet.velocity.y / bSpeed;
            target.speedBoostUntil = Math.max(target.speedBoostUntil, now + 350);
          }
          io.emit('bullet-hit', { bulletId: bullet.id, targetId: target.id, x: bullet.position.x, y: bullet.position.y });
          break;
        }
      }
      if (hit) {
        bullets.splice(i, 1);
      }
    }

    // 5b. Gun auto-fire
    for (const player of players.values()) {
      if (!player.hasGun || player.stunned) continue;
      const fireInterval = player.gunType === 'minigun' ? CONFIG.MINIGUN_FIRE_INTERVAL : CONFIG.GUN_FIRE_INTERVAL;
      if (now - player.lastGunFiredAt < fireInterval) continue;

      // Find nearest enemy within range
      let nearest: ServerPlayer | null = null;
      let nearestDist = Infinity;
      for (const other of players.values()) {
        if (other.id === player.id || other.stunned) continue;
        const d = distance(player.position, other.position);
        if (d < CONFIG.GUN_RANGE && d < nearestDist) {
          nearestDist = d;
          nearest = other;
        }
      }

      if (nearest) {
        // Aim at target's CURRENT position (not predictive — easy to dodge)
        const dx = nearest.position.x - player.position.x;
        const dy = nearest.position.y - player.position.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        let angle = Math.atan2(dy, dx);
        // Minigun has a random spread cone
        if (player.gunType === 'minigun') {
          angle += (Math.random() - 0.5) * 2 * CONFIG.MINIGUN_SPREAD;
        }
        bullets.push({
          id: bulletIdCounter++,
          ownerId: player.id,
          position: { x: player.position.x, y: player.position.y },
          velocity: { x: Math.cos(angle) * CONFIG.GUN_BULLET_SPEED, y: Math.sin(angle) * CONFIG.GUN_BULLET_SPEED },
          firedAt: now,
        });
        player.lastGunFiredAt = now;
        player.gunAmmo -= 1;
        if (player.gunAmmo <= 0) {
          player.hasGun = false;
          player.gunAmmo = 0;
        }
      }
    }

    // 5c. Hook fire, movement, latch, and pull
    // Fire pending hooks
    for (const player of players.values()) {
      if (player.hookFireAngle === null) continue;
      const angle = player.hookFireAngle;
      player.hookFireAngle = null;
      if (!player.hasHook || player.stunned) continue;
      if (hooks.some((h) => h.ownerId === player.id)) continue; // one hook at a time
      hooks.push({
        id: hookIdCounter++,
        ownerId: player.id,
        position: { x: player.position.x, y: player.position.y },
        startPosition: { x: player.position.x, y: player.position.y },
        velocity: {
          x: Math.cos(angle) * CONFIG.HOOK_PROJECTILE_SPEED,
          y: Math.sin(angle) * CONFIG.HOOK_PROJECTILE_SPEED,
        },
        firedAt: now,
        latchedTo: null,
        latchedAt: 0,
      });
      player.hasHook = false;
    }
    // Move hooks, apply latch collision, pull latched targets
    for (let i = hooks.length - 1; i >= 0; i--) {
      const hook = hooks[i];
      const owner = players.get(hook.ownerId);
      if (hook.latchedTo !== null) {
        const target = players.get(hook.latchedTo);
        if (!owner || owner.stunned || !target || target.stunned || now >= hook.latchedAt + CONFIG.HOOK_PULL_DURATION) {
          if (target) { target.hookedBy = null; target.hookedUntil = 0; }
          hooks.splice(i, 1);
          continue;
        }
        const dx = owner.position.x - target.position.x;
        const dy = owner.position.y - target.position.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > CONFIG.PLAYER_RADIUS * 2) {
          const sp = CONFIG.HOOK_PULL_SPEED * dt;
          target.position.x += (dx / d) * sp;
          target.position.y += (dy / d) * sp;
          target.position.x = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.ARENA_WIDTH - CONFIG.PLAYER_RADIUS, target.position.x));
          target.position.y = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.ARENA_HEIGHT - CONFIG.PLAYER_RADIUS, target.position.y));
        }
        hook.position.x = target.position.x;
        hook.position.y = target.position.y;
        continue;
      }
      // Hook in flight — move, check range/bounds, then check latch
      if (!owner) { hooks.splice(i, 1); continue; }
      hook.position.x += hook.velocity.x * dt;
      hook.position.y += hook.velocity.y * dt;
      const ax = hook.position.x - hook.startPosition.x;
      const ay = hook.position.y - hook.startPosition.y;
      if (
        Math.sqrt(ax * ax + ay * ay) >= CONFIG.HOOK_MAX_RANGE ||
        hook.position.x < 0 || hook.position.x > CONFIG.ARENA_WIDTH ||
        hook.position.y < 0 || hook.position.y > CONFIG.ARENA_HEIGHT
      ) {
        hooks.splice(i, 1);
        continue;
      }
      for (const target of players.values()) {
        if (target.id === hook.ownerId || target.stunned || now < target.spawnImmunityUntil || target.hookedBy) continue;
        if (distance(hook.position, target.position) < CONFIG.PLAYER_RADIUS + 12) {
          hook.latchedTo = target.id;
          hook.latchedAt = now;
          target.hookedBy = hook.ownerId;
          target.hookedUntil = now + CONFIG.HOOK_PULL_DURATION;
          io.emit('hook-latched', { ownerId: hook.ownerId, targetId: target.id });
          break;
        }
      }
    }

    // 5c. ICBM missile homing and detonation
    for (let i = missiles.length - 1; i >= 0; i--) {
      const missile = missiles[i];

      // Expire old missiles (self-destruct with a whimper)
      if (now - missile.firedAt > CONFIG.ICBM_LIFESPAN) {
        missiles.splice(i, 1);
        io.emit('icbm-explosion', { x: missile.position.x, y: missile.position.y, radius: CONFIG.ICBM_BLAST_RADIUS, fizzle: true });
        continue;
      }

      // Re-lock if target is gone or stunned; find next nearest
      let target = players.get(missile.targetId);
      if (!target || target.stunned) {
        target = undefined;
        let nearestDist = Infinity;
        for (const other of players.values()) {
          if (other.id === missile.ownerId || other.stunned) continue;
          const d = distance(missile.position, other.position);
          if (d < nearestDist) {
            nearestDist = d;
            target = other;
          }
        }
        if (target) missile.targetId = target.id;
      }

      if (target) {
        // Homing: steer velocity toward target at limited turn rate
        const currentAngle = Math.atan2(missile.velocity.y, missile.velocity.x);
        const dx = target.position.x - missile.position.x;
        const dy = target.position.y - missile.position.y;
        const desiredAngle = Math.atan2(dy, dx);
        // Shortest angular difference
        let angleDiff = desiredAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        const maxTurn = CONFIG.ICBM_TURN_RATE * dt;
        const turn = Math.abs(angleDiff) < maxTurn ? angleDiff : Math.sign(angleDiff) * maxTurn;
        const newAngle = currentAngle + turn;
        missile.velocity.x = Math.cos(newAngle) * CONFIG.ICBM_MISSILE_SPEED;
        missile.velocity.y = Math.sin(newAngle) * CONFIG.ICBM_MISSILE_SPEED;

        // Check detonation
        const distToTarget = distance(missile.position, target.position);
        if (distToTarget < CONFIG.ICBM_DETONATE_RADIUS) {
          // BOOM — AOE blast
          for (const victim of players.values()) {
            if (victim.stunned || now < victim.spawnImmunityUntil) continue;
            const distToBlast = distance(missile.position, victim.position);
            if (distToBlast < CONFIG.ICBM_BLAST_RADIUS) {
              // Armor absorbs one rocket blast hit.
              if (victim.hasHelmet) {
                victim.hasHelmet = false;
                io.to(victim.id).emit('helmet-protected', { disguisedAs: 'icbm' });
                continue;
              }
              // Stun the direct target; everyone in radius loses half their score
              victim.score = Math.max(0, Math.floor(victim.score / 2));
              victim.tail = computeTailFromHistory(victim.pathHistory, victim.score);
              victim.stunned = true;
              victim.stunnedUntil = now + CONFIG.STUN_DURATION;
              victim.hasHelmet = false;
              victim.zapCharge = 0;
              victim.hasGun = false;
              victim.gunAmmo = 0;
              victim.gunType = 'gun';
              victim.distanceTravelled = 0;
              io.emit('stunned', { playerId: victim.id, killerId: missile.ownerId });
            }
          }
          io.emit('icbm-explosion', { x: missile.position.x, y: missile.position.y, radius: CONFIG.ICBM_BLAST_RADIUS, fizzle: false });
          missiles.splice(i, 1);
          continue;
        }
      }

      // Move missile
      missile.position.x += missile.velocity.x * dt;
      missile.position.y += missile.velocity.y * dt;

      // Bounce off arena walls
      if (missile.position.x < 0 || missile.position.x > CONFIG.ARENA_WIDTH) {
        missile.velocity.x *= -1;
        missile.position.x = Math.max(0, Math.min(CONFIG.ARENA_WIDTH, missile.position.x));
      }
      if (missile.position.y < 0 || missile.position.y > CONFIG.ARENA_HEIGHT) {
        missile.velocity.y *= -1;
        missile.position.y = Math.max(0, Math.min(CONFIG.ARENA_HEIGHT, missile.position.y));
      }
    }

    // 6. Tail collision detection
    for (const player of players.values()) {
      if (player.stunned) continue;
      if (now < player.spawnImmunityUntil) continue;
      if (now < player.gluedUntil) continue;

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
        player.hasHelmet = false;
        player.zapCharge = 0;
        player.hasGun = false;
        player.gunAmmo = 0;
        player.gunType = 'gun';
        player.hasHook = false;
        player.hookFireAngle = null;
        player.hookedBy = null;
        player.hookedUntil = 0;
        for (let hi = hooks.length - 1; hi >= 0; hi--) {
          const hk = hooks[hi];
          if (hk.ownerId === player.id) {
            if (hk.latchedTo) { const t = players.get(hk.latchedTo); if (t) { t.hookedBy = null; t.hookedUntil = 0; } }
            hooks.splice(hi, 1);
          } else if (hk.latchedTo === player.id) {
            hooks.splice(hi, 1);
          }
        }
        player.distanceTravelled = 0;
        io.emit('stunned', { playerId: player.id, killerId: tailOwner?.id ?? null });
        // Self-kill: notify the dying player
        if (!tailOwner) {
          io.to(player.id).emit('ouroboros');
        }
      }
    }
  }, 1000 / CONFIG.TICK_RATE);

  // ─── State broadcast ─────────────────────────────────────────────────────────
  setInterval(() => {
    const state = serializeState(players, foods, powerups, blackholes, bullets, hooks, missiles);
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
    input: { up: false, down: false, left: false, right: false, sprint: false },
    facing: { x: Math.cos(angle), y: Math.sin(angle) },
    score: 0,
    tail: [],
    pathHistory: [{ ...position }],
    distanceTravelled: 0,
    stunned: false,
    stunnedUntil: 0,
    spawnImmunityUntil: Date.now() + CONFIG.SPAWN_IMMUNITY_MS,
    teleportImmunityUntil: 0,
    speedBoostUntil: 0,
    reversedUntil: 0,
    magnetUntil: 0,
    stamina: CONFIG.SPRINT_MAX_STAMINA,
    hasHelmet: false,
    zapCharge: 0,
    zapStunnedUntil: 0,
    gluedTo: null,
    gluedUntil: 0,
    hasGun: false,
    gunAmmo: 0,
    lastGunFiredAt: 0,
    gunType: 'gun',
    hasHook: false,
    hookFireAngle: null,
    hookedBy: null,
    hookedUntil: 0,
  };
  return player;
}

export { serializeState };
