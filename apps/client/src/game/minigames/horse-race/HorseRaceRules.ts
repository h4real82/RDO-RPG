export type PowerUpType = 'whiskey' | 'lasso' | 'dynamite' | 'horseshoe' | 'oil';

export interface RaceRider {
  id: string;
  speed: number;
  stamina: number;
  currentCheckpoint: number;
  lap: number;
  activePowerUp?: PowerUpType;
  isStunned: boolean;
}

export function updateRiderMovement(
  rider: RaceRider,
  isGalloping: boolean,
  deltaSec: number
): RaceRider {
  if (rider.isStunned) {
    return { ...rider, speed: 0 };
  }

  let stamina = rider.stamina;
  let maxSpeed = 12; // Base speed m/s

  if (isGalloping && stamina > 0) {
    maxSpeed = 22; // Gallop speed
    stamina = Math.max(0, stamina - 20 * deltaSec);
  } else {
    stamina = Math.min(100, stamina + 10 * deltaSec);
  }

  const speed = Math.min(maxSpeed, rider.speed + 8 * deltaSec);
  return { ...rider, speed, stamina };
}

export function advanceCheckpoint(currentCheckpoint: number, totalCheckpoints: number, currentLap: number, totalLaps: number) {
  const nextCheckpoint = (currentCheckpoint + 1) % totalCheckpoints;
  const newLap = nextCheckpoint === 0 ? currentLap + 1 : currentLap;
  const isFinished = newLap > totalLaps;
  return { nextCheckpoint, newLap, isFinished };
}

