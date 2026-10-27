export type ClubType = 'driver' | 'iron' | 'wedge' | 'putter';

export interface ClubConfig {
  name: string;
  maxPower: number; // m/s
  launchAngleDeg: number;
  spinFactor: number;
}

export const CLUBS: Record<ClubType, ClubConfig> = {
  driver: { name: 'Driver', maxPower: 35, launchAngleDeg: 15, spinFactor: 0.2 },
  iron: { name: 'Iron', maxPower: 24, launchAngleDeg: 32, spinFactor: 0.5 },
  wedge: { name: 'Wedge', maxPower: 15, launchAngleDeg: 55, spinFactor: 0.9 },
  putter: { name: 'Putter', maxPower: 8, launchAngleDeg: 0, spinFactor: 0.05 },
};

export interface BallState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  inMotion: boolean;
}

export interface GolfShotResult {
  distance: number;
  finalPosition: { x: number; y: number; z: number };
  strokes: number;
}

export function calculateLaunchVelocity(club: ClubType, powerPercent: number, yawRad: number) {
  const cfg = CLUBS[club];
  const p = Math.max(0.1, Math.min(1.0, powerPercent / 100));
  const speed = cfg.maxPower * p;
  const radAngle = (cfg.launchAngleDeg * Math.PI) / 180;
  
  const horizontalSpeed = speed * Math.cos(radAngle);
  const vy = speed * Math.sin(radAngle);
  const vx = horizontalSpeed * Math.sin(yawRad);
  const vz = horizontalSpeed * Math.cos(yawRad);

  return { vx, vy, vz };
}

export function checkHoleCup(ballPos: { x: number; z: number }, cupPos: { x: number; z: number }, radius: number = 0.5): boolean {
  const dx = ballPos.x - cupPos.x;
  const dz = ballPos.z - cupPos.z;
  return Math.hypot(dx, dz) <= radius;
}

