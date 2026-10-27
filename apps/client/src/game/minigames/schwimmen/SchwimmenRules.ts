export type CardSuit = 'H' | 'D' | 'C' | 'S';
export type CardRank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: CardSuit;
  rank: CardRank;
}

export function cardPoints(rank: CardRank): number {
  if (rank === 'A') return 11;
  if (['10', 'J', 'Q', 'K'].includes(rank)) return 10;
  return Number(rank);
}

export function evaluateHand(hand: Card[]): number {
  if (hand.length !== 3) return 0;

  // Check 3 of a kind (three 7s, three Jacks, etc.)
  if (hand[0].rank === hand[1].rank && hand[1].rank === hand[2].rank) {
    if (hand[0].rank === 'A') return 33; // Three Aces
    return 30.5;
  }

  // Calculate sum per suit
  const suitSums: Record<CardSuit, number> = { H: 0, D: 0, C: 0, S: 0 };
  for (const c of hand) {
    suitSums[c.suit] += cardPoints(c.rank);
  }

  return Math.max(...Object.values(suitSums));
}

export function isSchnautz(hand: Card[]): boolean {
  return evaluateHand(hand) === 31;
}

