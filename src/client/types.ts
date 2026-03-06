export interface Vec2 {
  x: number;
  y: number;
}

export type PowerupType = 'speed' | 'double-tail' | 'reverse';

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

export interface GameStatePayload {
  players: ClientPlayer[];
  foods: ClientFood[];
  powerups: ClientPowerup[];
  blackholes: ClientBlackHole[];
}
