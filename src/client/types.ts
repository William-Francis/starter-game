export interface Vec2 {
  x: number;
  y: number;
}

export type PowerupType = 'speed' | 'double-tail' | 'reverse' | 'magnet' | 'coin-flip' | 'helmet' | 'omni' | 'jack-in-the-box' | 'gun' | 'minigun' | 'icbm';

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
  facingAngle: number;
  invulnerableUntil: number;
  hasHelmet: boolean;
  zapCharge: number;       // 0 = empty, ZAP_PELLET_THRESHOLD = fully charged
  zapStunnedUntil: number; // timestamp until which this player is zap-stunned
  gluedTo: string | null;  // id of the other glued player
  gluedUntil: number;      // timestamp when glue expires
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
  paired?: number; // id of the exit hole
  color: string; // hex color for this pair
}

export interface ClientBullet {
  id: number;
  ownerId: string;
  x: number;
  y: number;
}

export interface ClientHook {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  latchedTo: string | null;
}

export interface ClientMissile {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  angle: number;
  targetId: string;
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
