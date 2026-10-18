import { describe, expect, it } from 'vitest';
import { DartsRound, scoreDart, driftingAim } from './SaloonDartsRules';

describe('Saloon target practice rules', () => {
  it('scores concentric edges inclusively and counts off-board throws as misses', () => {
    expect(scoreDart({ x: 0, y: 0 })).toBe(50);
    expect(scoreDart({ x: 0.15, y: 0 })).toBe(50);
    expect(scoreDart({ x: 0.151, y: 0 })).toBe(25);
    expect(scoreDart({ x: 0, y: -0.5 })).toBe(25);
    expect(scoreDart({ x: 0.501, y: 0 })).toBe(10);
    expect(scoreDart({ x: -1, y: 0 })).toBe(10);
    expect(scoreDart({ x: 0.8, y: 0.8 })).toBe(0);
    expect(scoreDart({ x: NaN, y: 0 })).toBe(0);
  });

  it('ends after six throws, rejects a seventh, and resets the complete scorecard', () => {
    const round = new DartsRound();
    for (const x of [0, 0.3, 0.7, 2, 0, 0.8]) round.throwAt({ x, y: 0 });
    expect(round.total).toBe(145);
    expect(round.complete).toBe(true);
    expect(round.throwAt({ x: 0, y: 0 })).toBeNull();
    expect(round.throws).toHaveLength(6);
    round.reset();
    expect(round.total).toBe(0);
    expect(round.complete).toBe(false);
    expect(round.throws).toEqual([]);
  });

  it('uses elapsed time for repeatable drift instead of random accuracy', () => {
    expect(driftingAim({ x: 0, y: 0 }, 0)).toEqual({ x: 0, y: 0 });
    const quarter = driftingAim({ x: 0.1, y: -0.2 }, 600);
    expect(quarter.x).toBeCloseTo(0.32);
    expect(quarter.y).toBeCloseTo(-0.2);
    expect(driftingAim({ x: 0.1, y: -0.2 }, 600)).toEqual(quarter);
  });
});
