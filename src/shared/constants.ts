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
  POWERUP_SPEED_DURATION: 5000,   // ms
  POWERUP_REVERSE_DURATION: 5000, // ms
  POWERUP_SPEED_MULTIPLIER: 1.8,
} as const;

export type PowerupType = 'speed' | 'double-tail' | 'reverse';
export const POWERUP_TYPES: PowerupType[] = ['speed', 'double-tail', 'reverse'];

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

