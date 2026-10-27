import { describe, expect, it } from 'vitest';
import { CLUBS, calculateLaunchVelocity, checkHoleCup } from './GolfRules';

describe('GolfRules', () => {
  it('calculates driver launch with high horizontal speed', () => {
    const launch = calculateLaunchVelocity('driver', 100, 0);
    expect(launch.vz).toBeGreaterThan(30);
    expect(launch.vy).toBeGreaterThan(5);
  });

  it('detects ball in cup within threshold', () => {
    expect(checkHoleCup({ x: 10, z: 20 }, { x: 10.2, z: 20.1 }, 0.5)).toBe(true);
    expect(checkHoleCup({ x: 10, z: 20 }, { x: 11.5, z: 20.0 }, 0.5)).toBe(false);
  });
});

