export type Card = string; // e.g. 'AS', 'KH', 'TD', '2C'

export interface HandValue {
  total: number;
  isSoft: boolean;
  isBust: boolean;
  isBlackjack: boolean;
}

export interface CardDisplay {
  text: string;
  suit: string;
  red: boolean;
  hidden: boolean;
}

export function formatCard(card: Card): CardDisplay {
  if (card === '??') {
    return { text: '🂠', suit: '🂠', red: false, hidden: true };
  }
  const rank = card[0];
  const suitChar = card[1];
  const suitMap: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const suit = suitMap[suitChar] ?? suitChar;
  const red = suitChar === 'H' || suitChar === 'D';
  const displayRank = rank === 'T' ? '10' : rank;
  return { text: displayRank + suit, suit, red, hidden: false };
}

export function calculateHandValue(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card === '??') continue;
    const rank = card[0];
    if (rank === 'A') {
      aces += 1;
      total += 11;
    } else if (['T', 'J', 'Q', 'K'].includes(rank)) {
      total += 10;
    } else {
      total += parseInt(rank, 10);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  const isSoft = aces > 0 && total <= 21;
  const isBust = total > 21;
  const isBlackjack = cards.length === 2 && total === 21;

  return { total, isSoft, isBust, isBlackjack };
}

export interface BlackjackVariant {
  gameId: 'blackjack';
  rulesVersion: 'valentine-blackjack-v1';
  minBet: number;
  maxBet: number;
  dealerStandsOn: number;
  blackjackPayout: number;
}

export const DEFAULT_BLACKJACK: BlackjackVariant = {
  gameId: 'blackjack',
  rulesVersion: 'valentine-blackjack-v1',
  minBet: 10,
  maxBet: 250,
  dealerStandsOn: 17,
  blackjackPayout: 1.5
};

export function parseBlackjackVariant(value: unknown): BlackjackVariant {
  const v = value as Partial<BlackjackVariant> | undefined;
  if (!v || typeof v !== 'object') return DEFAULT_BLACKJACK;
  return {
    gameId: 'blackjack',
    rulesVersion: 'valentine-blackjack-v1',
    minBet: typeof v.minBet === 'number' && v.minBet > 0 ? v.minBet : DEFAULT_BLACKJACK.minBet,
    maxBet: typeof v.maxBet === 'number' && v.maxBet >= (v.minBet ?? 10) ? v.maxBet : DEFAULT_BLACKJACK.maxBet,
    dealerStandsOn: typeof v.dealerStandsOn === 'number' ? v.dealerStandsOn : DEFAULT_BLACKJACK.dealerStandsOn,
    blackjackPayout: typeof v.blackjackPayout === 'number' ? v.blackjackPayout : DEFAULT_BLACKJACK.blackjackPayout
  };
}

export function createDeck(deckCount = 4): Card[] {
  const suits = ['S', 'H', 'D', 'C'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (let d = 0; d < deckCount; d++) {
    for (const s of suits) {
      for (const r of ranks) {
        deck.push(r + s);
      }
    }
  }

  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export type RoundOutcome =
  | 'player_blackjack'
  | 'player_win'
  | 'dealer_bust'
  | 'push'
  | 'dealer_win'
  | 'player_bust'
  | 'in_progress';

export interface RoundResult {
  outcome: RoundOutcome;
  playerTotal: number;
  dealerTotal: number;
  payout: number;
  message: string;
}

export class BlackjackGame {
  private deck: Card[] = [];
  playerCards: Card[] = [];
  dealerCards: Card[] = [];
  dealerHoleCard?: Card;
  currentBet = 0;
  roundActive = false;
  dealerRevealed = false;

  constructor(public readonly config: BlackjackVariant = DEFAULT_BLACKJACK) {
    this.deck = createDeck(4);
  }

  private drawCard(): Card {
    if (this.deck.length < 15) {
      this.deck = createDeck(4);
    }
    return this.deck.pop()!;
  }

  deal(bet: number): { playerValue: HandValue; dealerVisible: Card; roundImmediateEnd?: RoundResult } {
    if (bet < this.config.minBet || bet > this.config.maxBet) {
      throw new Error(`Einsatz muss zwischen ${this.config.minBet} und ${this.config.maxBet} Coins liegen.`);
    }

    this.currentBet = bet;
    this.playerCards = [this.drawCard(), this.drawCard()];
    const dealerVisible = this.drawCard();
    this.dealerHoleCard = this.drawCard();
    this.dealerCards = [dealerVisible, '??'];
    this.dealerRevealed = false;
    this.roundActive = true;

    const playerVal = calculateHandValue(this.playerCards);

    // Natural Blackjack check
    if (playerVal.isBlackjack) {
      // Reveal dealer hole card
      this.dealerCards = [dealerVisible, this.dealerHoleCard];
      this.dealerRevealed = true;
      this.roundActive = false;

      const dealerVal = calculateHandValue(this.dealerCards);
      if (dealerVal.isBlackjack) {
        // Push
        return {
          playerValue: playerVal,
          dealerVisible,
          roundImmediateEnd: {
            outcome: 'push',
            playerTotal: 21,
            dealerTotal: 21,
            payout: this.currentBet,
            message: 'Beide haben einen Natural Blackjack! Unentschieden (Push) – Einsatz zurück.'
          }
        };
      }

      // Natural 3:2 payout: bet + floor(bet * 1.5)
      const winPayout = this.currentBet + Math.floor(this.currentBet * this.config.blackjackPayout);
      return {
        playerValue: playerVal,
        dealerVisible,
        roundImmediateEnd: {
          outcome: 'player_blackjack',
          playerTotal: 21,
          dealerTotal: dealerVal.total,
          payout: winPayout,
          message: `🎉 NATURAL BLACKJACK! Du gewinnst 💰 ${winPayout} Coins (3:2 Auszahlung)!`
        }
      };
    }

    return { playerValue: playerVal, dealerVisible };
  }

  hit(): { playerValue: HandValue; newCard: Card; bustResult?: RoundResult } {
    if (!this.roundActive) throw new Error('Keine aktive Runde');

    const card = this.drawCard();
    this.playerCards.push(card);
    const playerVal = calculateHandValue(this.playerCards);

    if (playerVal.isBust) {
      this.roundActive = false;
      this.revealDealer();
      const dealerVal = calculateHandValue(this.dealerCards);
      return {
        playerValue: playerVal,
        newCard: card,
        bustResult: {
          outcome: 'player_bust',
          playerTotal: playerVal.total,
          dealerTotal: dealerVal.total,
          payout: 0,
          message: `💥 Überkauft mit ${playerVal.total} Punkten! Der Saloon-Dealer kassiert den Einsatz.`
        }
      };
    }

    return { playerValue: playerVal, newCard: card };
  }

  stand(): RoundResult {
    if (!this.roundActive) throw new Error('Keine aktive Runde');
    this.roundActive = false;

    this.revealDealer();
    let dealerVal = calculateHandValue(this.dealerCards);

    // Dealer hits on 16 or lower, stands on 17
    while (dealerVal.total < this.config.dealerStandsOn) {
      this.dealerCards.push(this.drawCard());
      dealerVal = calculateHandValue(this.dealerCards);
    }

    const playerVal = calculateHandValue(this.playerCards);

    if (dealerVal.isBust) {
      const payout = this.currentBet * 2;
      return {
        outcome: 'dealer_bust',
        playerTotal: playerVal.total,
        dealerTotal: dealerVal.total,
        payout,
        message: `🏆 Der Dealer hat sich mit ${dealerVal.total} überkauft! Du gewinnst 💰 ${payout} Coins!`
      };
    }

    if (playerVal.total > dealerVal.total) {
      const payout = this.currentBet * 2;
      return {
        outcome: 'player_win',
        playerTotal: playerVal.total,
        dealerTotal: dealerVal.total,
        payout,
        message: `🏆 Du gewinnst mit ${playerVal.total} gegen ${dealerVal.total}! Auszahlung: 💰 ${payout} Coins!`
      };
    }

    if (playerVal.total === dealerVal.total) {
      const payout = this.currentBet;
      return {
        outcome: 'push',
        playerTotal: playerVal.total,
        dealerTotal: dealerVal.total,
        payout,
        message: `🤝 Unentschieden (${playerVal.total} zu ${dealerVal.total}). Einsatz zurück: 💰 ${payout} Coins.`
      };
    }

    return {
      outcome: 'dealer_win',
      playerTotal: playerVal.total,
      dealerTotal: dealerVal.total,
      payout: 0,
      message: `Der Dealer gewinnt mit ${dealerVal.total} gegen deine ${playerVal.total}.`
    };
  }

  canDouble(): boolean {
    return this.roundActive && this.playerCards.length === 2;
  }

  doubleDown(): { playerValue: HandValue; dealtCard: Card; result: RoundResult } {
    if (!this.canDouble()) throw new Error('Verdoppeln ist nur mit den ersten 2 Karten möglich.');

    this.currentBet *= 2;
    const card = this.drawCard();
    this.playerCards.push(card);
    const playerVal = calculateHandValue(this.playerCards);

    if (playerVal.isBust) {
      this.roundActive = false;
      this.revealDealer();
      const dealerVal = calculateHandValue(this.dealerCards);
      return {
        playerValue: playerVal,
        dealtCard: card,
        result: {
          outcome: 'player_bust',
          playerTotal: playerVal.total,
          dealerTotal: dealerVal.total,
          payout: 0,
          message: `💥 Verdoppelt und überkauft (${playerVal.total})! Einsatz verloren.`
        }
      };
    }

    const standRes = this.stand();
    return {
      playerValue: playerVal,
      dealtCard: card,
      result: standRes
    };
  }

  private revealDealer(): void {
    if (!this.dealerRevealed && this.dealerHoleCard) {
      this.dealerCards = [this.dealerCards[0], this.dealerHoleCard];
      this.dealerRevealed = true;
    }
  }
}

