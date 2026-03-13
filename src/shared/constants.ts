export const CONFIG = {
  ARENA_WIDTH: 2000,
  ARENA_HEIGHT: 2000,
  PLAYER_RADIUS: 20,
  TAIL_SEGMENT_RADIUS: 14,
  TAIL_SEGMENT_SPACING: 20,   // px of travel between segments
  FOOD_RADIUS: 8,
  FOOD_TARGET_COUNT: 50,
  PLAYER_SPEED: 200,          // units/sec
  STUN_DURATION: 4000,        // ms
  TICK_RATE: 60,              // ticks/sec
  BROADCAST_RATE: 20,         // state broadcasts/sec
  MAX_PLAYER_NAME_LENGTH: 16,
  MAX_PLAYERS: 20,
  SPAWN_IMMUNITY_MS: 2000,
  POWERUP_RADIUS: 14,
  POWERUP_TARGET_COUNT: 3,
  HELMET_TARGET_COUNT: 2,         // number of helmets to keep in arena
  POWERUP_SPEED_DURATION: 5000,   // ms
  POWERUP_REVERSE_DURATION: 5000, // ms
  POWERUP_SPEED_MULTIPLIER: 1.8,
  POWERUP_LIFESPAN: 10000,        // ms before an uncollected powerup despawns
  POWERUP_MAGNET_DURATION: 5000,  // ms
  POWERUP_MAGNET_RADIUS: 200,     // px — food attraction pull range
  POWERUP_COIN_FLIP_WIN: 5,       // points gained on heads
  POWERUP_COIN_FLIP_LOSS: 2,      // points lost on tails (minor)
  OMNI_TARGET_COUNT: 1,           // one omni powerup in arena at a time
  ZAP_PELLET_THRESHOLD: 10,       // food pellets needed to charge the zap
  ZAP_STUN_DURATION: 400,         // ms the zap stuns the target
  SPRINT_SPEED_MULTIPLIER: 1.2,
  SPRINT_MAX_STAMINA: 100,        // unitless
  SPRINT_DRAIN_RATE: 40,          // stamina/sec
  SPRINT_RECHARGE_RATE: 20,       // stamina/sec
  SPRINT_MIN_STAMINA: 10,         // minimum to begin a sprint
  BLACKHOLE_RADIUS: 40,           // visual radius
  BLACKHOLE_TARGET_COUNT: 4,      // number of black holes in arena
  BLACKHOLE_MIN_DISTANCE: 300,    // minimum distance between holes
  JACKBOX_TARGET_COUNT: 1,        // keep at most one jack-in-the-box on map
  JACKBOX_RESPAWN_CHANCE_PER_TICK: 0.001, // rare respawn chance (~every 16s on average when absent)
  JACKBOX_GLUE_DURATION: 5000,    // ms players stay glued
  JACKBOX_BLAST_SPEED: 800,       // units/sec blast speed when released
  GUN_TARGET_COUNT: 1,            // gun pickups on map at once
  GUN_RANGE: 500,                 // 5 grid squares × 100 units
  GUN_FIRE_INTERVAL: 1200,        // ms between auto-shots
  GUN_BULLET_SPEED: 400,          // units/sec
  GUN_KNOCKBACK_SPEED: 300,       // units/sec applied to hit player
  GUN_AMMO: 5,                    // shots before gun disappears
  GUN_BULLET_RADIUS: 8,           // collision radius for hit detection
  MINIGUN_TARGET_COUNT: 1,        // minigun pickups on map at once
  MINIGUN_AMMO: 100,              // shots (burns through fast)
  MINIGUN_FIRE_INTERVAL: 80,      // ms between shots — ~12 shots/sec
  MINIGUN_SPREAD: 0.18,           // radians half-angle spread cone
  ICBM_TARGET_COUNT: 1,           // ICBM pickups on map at once
  ICBM_MISSILE_SPEED: 200,        // units/sec (same as player — run or dodge!)
  ICBM_TURN_RATE: 1.5,            // radians/sec max homing turn rate
  ICBM_DETONATE_RADIUS: 35,       // explode when within this distance of target
  ICBM_BLAST_RADIUS: 130,         // AOE explosion radius
  ICBM_LIFESPAN: 15000,           // ms before self-destruct
  HOOK_TARGET_COUNT: 1,           // hook pickups in arena at once
  HOOK_PROJECTILE_SPEED: 800,     // units/sec the hook tip flies
  HOOK_MAX_RANGE: 700,            // units before hook despawns
  HOOK_PULL_SPEED: 400,           // units/sec the hooked target is pulled
  HOOK_PULL_DURATION: 1500,       // ms the pull lasts after latching
} as const;

export type PowerupType = 'speed' | 'double-tail' | 'reverse' | 'magnet' | 'coin-flip' | 'helmet' | 'omni' | 'jack-in-the-box' | 'gun' | 'minigun' | 'icbm' | 'hook';
export const POWERUP_TYPES: PowerupType[] = ['speed', 'double-tail', 'reverse', 'magnet', 'coin-flip', 'helmet', 'omni', 'jack-in-the-box', 'gun', 'minigun', 'icbm', 'hook'];

export const EVENTS = {
  // client -> server
  JOIN: 'join',
  INPUT: 'input',
  // server -> client
  JOINED: 'joined',
  STATE: 'state',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  STUNNED: 'stunned',
} as const;

