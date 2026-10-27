import { describe, expect, it } from 'vitest';
import { advanceCheckpoint, updateRiderMovement, type RaceRider } from './HorseRaceRules';

describe('HorseRaceRules', () => {
  it('increases speed and drains stamina when galloping', () => {
    const rider: RaceRider = { id: 'p1', speed: 10, stamina: 100, currentCheckpoint: 0, lap: 1, isStunned: false };
    const updated = updateRiderMovement(rider, true, 1.0);
    expect(updated.speed).toBeGreaterThan(10);
    expect(updated.stamina).toBeLessThan(100);
  });

  it('advances laps correctly', () => {
    const res = advanceCheckpoint(3, 4, 1, 2);
    expect(res.nextCheckpoint).toBe(0);
    expect(res.newLap).toBe(2);
    expect(res.isFinished).toBe(false);
  });
});

