import { describe, expect, it } from 'vitest';
import { calculateInputDistortionLag, drinkRound, type DrunkardState } from './WettsaufenRules';

describe('WettsaufenRules', () => {
  it('reduces energy and causes KO when energy hits 0', () => {
    const state: DrunkardState = { name:'Arthur', energy: 20, intoxication: 50, drinksConsumed: 2 };
    const res = drinkRound(state, 'whiskey', 'miss'); // 15 * 2 = 30 penalty
    expect(res.isKO).toBe(true);
    expect(res.state.energy).toBe(0);
  });

  it('calculates input distortion lag based on intoxication', () => {
    expect(calculateInputDistortionLag(20)).toBe(0);
    expect(calculateInputDistortionLag(60)).toBeGreaterThan(100);
  });
});

