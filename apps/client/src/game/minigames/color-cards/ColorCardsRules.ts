export type UnoColor = 'red' | 'gold' | 'green' | 'blue' | 'wild';
export type UnoCardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wildDraw4';

export interface UnoCard {
  id: string;
  color: UnoColor;
  type: UnoCardType;
  value?: number; // 0-9 for numbers
}

export function isCardPlayable(card: UnoCard, topCard: UnoCard, activeColor: UnoColor): boolean {
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
  if (card.type !== 'number' && card.type === topCard.type) return true;
  return false;
}

