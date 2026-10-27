import { describe, expect, it } from 'vitest';
import { isCardPlayable, type UnoCard } from './ColorCardsRules';

describe('ColorCardsRules', () => {
  it('allows matching color and matching value', () => {
    const topCard: UnoCard = { id: '1', color: 'red', type: 'number', value: 5 };
    
    // Same color
    expect(isCardPlayable({ id: '2', color: 'red', type: 'number', value: 8 }, topCard, 'red')).toBe(true);
    // Same number, different color
    expect(isCardPlayable({ id: '3', color: 'blue', type: 'number', value: 5 }, topCard, 'red')).toBe(true);
    // Wild is always playable
    expect(isCardPlayable({ id: '4', color: 'wild', type: 'wild' }, topCard, 'red')).toBe(true);
    // Mismatch
    expect(isCardPlayable({ id: '5', color: 'green', type: 'number', value: 2 }, topCard, 'red')).toBe(false);
  });
});

