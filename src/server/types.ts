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
  teleportImmunityUntil: number;
  speedBoostUntil: number;
  reversedUntil: number;
  magnetUntil: number;
  stamina: number;
  hasHelmet: boolean;     // protection against next scam
  zapCharge: number;      // food pellets collected since last zap (0–ZAP_PELLET_THRESHOLD)
  zapStunnedUntil: number; // timestamp until which this player is zap-stunned
  gluedTo: string | null;  // id of player this one is glued to
  gluedUntil: number;      // timestamp when glue expires
  hasGun: boolean;         // player is carrying a gun pickup
  gunAmmo: number;         // shots remaining
  lastGunFiredAt: number;  // timestamp of last gun shot
  gunType: 'gun' | 'minigun'; // which gun is equipped
  hasHook: boolean;        // player is carrying a hook pickup
  hookFireAngle: number | null; // angle (radians) of pending hook fire; consumed once per tick
  hookedBy: string | null; // id of the player whose hook has latched onto us
  hookedUntil: number;     // timestamp when the hook pull expires
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

export interface ServerBullet {
  id: number;
  ownerId: string;
  position: Vec2;
  velocity: Vec2;
  firedAt: number;
}

export interface ServerMissile {
  id: number;
  ownerId: string;
  position: Vec2;
  velocity: Vec2;   // direction * speed
  targetId: string; // ID of the homing target
  firedAt: number;
}

export interface ServerHook {
  id: number;
  ownerId: string;
  position: Vec2;
  startPosition: Vec2;
  velocity: Vec2;
  firedAt: number;
  latchedTo: string | null;
  latchedAt: number;
}

export interface ServerBlackHole {
  id: number;
  position: Vec2;
  radius: number;
  paired?: number; // id of the exit hole
  color: string; // hex color for this pair
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
  magnetUntil: number;
  stamina: number;
  facingAngle: number;    // radians, derived from facing vector
  invulnerableUntil: number; // timestamp until which this player can't be killed
  hasHelmet: boolean;
  zapCharge: number;
  zapStunnedUntil: number;
  gluedTo: string | null;
  gluedUntil: number;
  hasGun: boolean;
  gunAmmo: number;
  gunType: 'gun' | 'minigun';
  hasHook: boolean;
  hookedBy: string | null;
  hookedUntil: number;
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

export interface ClientBlackHole {
  id: number;
  x: number;
  y: number;
  radius: number;
  paired?: number;
}

export interface ClientBullet {
  id: number;
  ownerId: string;
  x: number;
  y: number;
}

export interface ClientMissile {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  angle: number;    // facing angle in radians
  targetId: string;
}

export interface ClientHook {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  latchedTo: string | null;
}

export interface GameStatePayload {
  players: ClientPlayer[];
  foods: ClientFood[];
  powerups: ClientPowerup[];
  blackholes: ClientBlackHole[];
  bullets: ClientBullet[];
  hooks: ClientHook[];
  missiles: ClientMissile[];
}

export interface JoinPayload {
  name: string;
  color: string;
}

export interface JoinedPayload {
  playerId: string;
  gameState: GameStatePayload;
}
