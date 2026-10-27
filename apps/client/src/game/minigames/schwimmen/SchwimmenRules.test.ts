import { describe, expect, it } from 'vitest';
import { evaluateHand, isSchnautz, type Card } from './SchwimmenRules';

describe('SchwimmenRules', () => {
  it('adds cards of identical suit correctly', () => {
    const hand: Card[] = [
      { suit: 'H', rank: 'A' },  // 11
      { suit: 'H', rank: 'K' },  // 10
      { suit: 'H', rank: '9' },  // 9
    ];
    expect(evaluateHand(hand)).toBe(30);
  });

  it('detects 31 (Schnautz / Feuer)', () => {
    const hand: Card[] = [
      { suit: 'S', rank: 'A' },  // 11
      { suit: 'S', rank: 'K' },  // 10
      { suit: 'S', rank: '10' }, // 10
    ];
    expect(isSchnautz(hand)).toBe(true);
  });

  it('evaluates three of a kind as 30.5', () => {
    const hand: Card[] = [
      { suit: 'H', rank: '7' },
      { suit: 'D', rank: '7' },
      { suit: 'S', rank: '7' },
    ];
    expect(evaluateHand(hand)).toBe(30.5);
  });
});

