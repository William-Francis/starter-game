import { PowerupType } from '../shared/constants';

export interface Vec2 {
  x: number;
  y: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

// ─── Server-side (mutable, full detail) ────────────────────────────────────

export interface ServerPlayer {
  id: string;
  name: string;
  color: string;
  position: Vec2;
  input: InputState;
  facing: Vec2;           // normalised direction vector, always set
  score: number;
  tail: Vec2[];           // world positions of tail segments
  pathHistory: Vec2[];    // dense position history for tail generation
  distanceTravelled: number;
  stunned: boolean;
  stunnedUntil: number;
  spawnImmunityUntil: number;
  speedBoostUntil: number;
  reversedUntil: number;
  stamina: number;
}

export interface ServerPowerup {
  id: number;
  type: PowerupType;
  disguiseType?: PowerupType; // for reverse powerups that masquerade as another type
  position: Vec2;
  spawnedAt: number;
}

export interface ServerFood {
  id: number;
  position: Vec2;
}

// ─── Wire format (sent over socket) ─────────────────────────────────────────

export interface ClientPlayer {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  tail: Vec2[];
  score: number;
  stunned: boolean;
  stunnedUntil: number;
  speedBoostUntil: number;
  reversedUntil: number;
  stamina: number;
  facingAngle: number;    // radians, derived from facing vector
}

export interface ClientFood {
  id: number;
  x: number;
  y: number;
}

export interface ClientPowerup {
  id: number;
  type: PowerupType;
  x: number;
  y: number;
}

export interface GameStatePayload {
  players: ClientPlayer[];
  foods: ClientFood[];
  powerups: ClientPowerup[];
}

export interface JoinPayload {
  name: string;
  color: string;
}

export interface JoinedPayload {
  playerId: string;
  gameState: GameStatePayload;
}
