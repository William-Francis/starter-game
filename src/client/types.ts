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
