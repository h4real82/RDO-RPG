import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateHandValue,
  formatCard,
  parseBlackjackVariant,
  createDeck,
  BlackjackGame,
  DEFAULT_BLACKJACK,
  type Card
} from './BlackjackRules';
import { LocalAccountStore, createDefaultGuestProfile } from '../../economy/LocalAccountStore';
import { WalletService } from '../../economy/WalletService';

function scriptedGame(cards:Card[]=['5S','6H','8H','9D','TH']) {
 const game=new BlackjackGame(DEFAULT_BLACKJACK),draws=[...cards];
 vi.spyOn(game as unknown as {drawCard():Card},'drawCard').mockImplementation(()=>{
  const card=draws.shift();if(!card)throw new Error('Scripted shoe exhausted');return card;
 });
 return game;
}

describe('Blackjack Hand Value & Card Evaluator (H4R-90)', () => {
  it('correctly calculates numeric and face card values', () => {
    expect(calculateHandValue(['2H', '5S']).total).toBe(7);
    expect(calculateHandValue(['TC', 'JD']).total).toBe(20);
    expect(calculateHandValue(['QS', 'KD']).total).toBe(20);
    expect(calculateHandValue(['7D', '8C', '6S']).total).toBe(21);
  });

  it('handles soft and hard Ace transitions', () => {
    // Ace + 7 = 18 (Soft)
    const soft18 = calculateHandValue(['AS', '7H']);
    expect(soft18.total).toBe(18);
    expect(soft18.isSoft).toBe(true);
    expect(soft18.isBust).toBe(false);

    // Ace + 7 + 5 = 13 (Hard Ace reduced to 1)
    const hard13 = calculateHandValue(['AS', '7H', '5C']);
    expect(hard13.total).toBe(13);
    expect(hard13.isSoft).toBe(false);
    expect(hard13.isBust).toBe(false);

    // Two Aces = 12
    const twoAces = calculateHandValue(['AS', 'AH']);
    expect(twoAces.total).toBe(12);
    expect(twoAces.isSoft).toBe(true);

    // Two Aces + 9 = 21
    const aceAceNine = calculateHandValue(['AS', 'AH', '9D']);
    expect(aceAceNine.total).toBe(21);
    expect(aceAceNine.isSoft).toBe(true);
  });

  it('detects Bust correctly', () => {
    const bustHand = calculateHandValue(['KH', '8D', '5S']);
    expect(bustHand.total).toBe(23);
    expect(bustHand.isBust).toBe(true);
  });

  it('distinguishes Natural Blackjack from 21 points with 3+ cards', () => {
    const naturalBJ = calculateHandValue(['AS', 'KC']);
    expect(naturalBJ.total).toBe(21);
    expect(naturalBJ.isBlackjack).toBe(true);

    const threeCard21 = calculateHandValue(['7S', '7H', '7D']);
    expect(threeCard21.total).toBe(21);
    expect(threeCard21.isBlackjack).toBe(false);
  });

  it('formats cards with rank, suit and color', () => {
    const aceSpades = formatCard('AS');
    expect(aceSpades.suit).toBe('♠');
    expect(aceSpades.red).toBe(false);
    expect(aceSpades.hidden).toBe(false);

    const tenHearts = formatCard('TH');
    expect(tenHearts.text).toBe('10♥');
    expect(tenHearts.suit).toBe('♥');
    expect(tenHearts.red).toBe(true);

    const hiddenCard = formatCard('??');
    expect(hiddenCard.hidden).toBe(true);
  });
});

describe('Blackjack Game Engine & Ruleflow (H4R-90)', () => {
  it('initializes deck and respects variant limits', () => {
    const game = scriptedGame();
    expect(game.config.minBet).toBe(10);
    expect(game.config.maxBet).toBe(250);
    expect(game.config.dealerStandsOn).toBe(17);
    expect(game.config.blackjackPayout).toBe(1.5);

    expect(() => game.deal(5)).toThrow(/zwischen 10 und 250/);
    expect(() => game.deal(500)).toThrow(/zwischen 10 und 250/);
  });

  it('deals 2 cards to player and 2 cards (1 hidden) to dealer', () => {
    const game = scriptedGame();
    const dealRes = game.deal(50);

    expect(game.currentBet).toBe(50);
    expect(game.playerCards.length).toBe(2);
    expect(game.dealerCards.length).toBe(2);
    expect(game.dealerCards[1]).toBe('??');
    expect(dealRes.dealerVisible).toBe(game.dealerCards[0]);
  });

  it('allows player to hit and detects bust if total exceeds 21', () => {
    const game = scriptedGame();
    game.deal(25);

    // Rig cards to guarantee bust
    game.playerCards = ['TH', '8S'];
    const hitRes = game.hit();
    // After hit, playerCards has 3 cards
    expect(game.playerCards.length).toBe(3);
    expect(hitRes.playerValue.isBust).toBe(true);
    expect(game.roundActive).toBe(false);
    expect(hitRes.bustResult?.payout).toBe(0);
    expect(hitRes.bustResult?.outcome).toBe('player_bust');
  });

  it('dealer stands on 17 and resolves outcomes upon player stand', () => {
    const game = scriptedGame();
    game.deal(50);

    // Set controlled hands
    game.playerCards = ['TS', '9C']; // 19 points
    game.dealerCards = ['8H', '??'];
    game.dealerHoleCard = '9D'; // Total 17 -> dealer stands

    const result = game.stand();
    expect(game.roundActive).toBe(false);
    expect(result.playerTotal).toBe(19);
    expect(result.dealerTotal).toBe(17);
    expect(result.outcome).toBe('player_win');
    expect(result.payout).toBe(100); // 50 bet * 2
  });

  it('pays push if player and dealer tie', () => {
    const game = scriptedGame();
    game.deal(50);

    game.playerCards = ['TS', '8C']; // 18 points
    game.dealerCards = ['8H', '??'];
    game.dealerHoleCard = 'TD'; // 18 points

    const result = game.stand();
    expect(result.outcome).toBe('push');
    expect(result.payout).toBe(50); // Bet returned
  });

  it('supports double down: doubles bet, receives 1 card, and ends round', () => {
    const game = scriptedGame();
    game.deal(50);
    expect(game.canDouble()).toBe(true);

    game.playerCards = ['6S', '5H']; // 11 points
    const doubleRes = game.doubleDown();

    expect(game.currentBet).toBe(100);
    expect(game.playerCards.length).toBe(3);
    expect(game.roundActive).toBe(false);
    expect(doubleRes.result).toBeDefined();
  });
});

describe('Blackjack Coin Wagering & Settlement (H4R-90 & H4R-88)', () => {
  beforeEach(() => {
    const profile = createDefaultGuestProfile();
    profile.coins = '1000';
    LocalAccountStore.saveProfile(profile);
    WalletService.setActiveProfile(null, false);
  });

  it('atomically reserves wager and settles winnings into wallet', async () => {
    const initialCoins = WalletService.getSyncBalance();
    expect(initialCoins).toBe(1000n);

    const bet = 100;
    const reserved = await WalletService.reserveBet(bet, 'blackjack-table');
    expect(reserved).toBe(true);
    expect(WalletService.getSyncBalance()).toBe(900n);

    // Simulate winning a standard round (payout = 200 Coins)
    const payout = 200;
    const settled = await WalletService.settlePot(payout, 'blackjack-win');
    expect(settled).toBe(1100n);
    expect(WalletService.getSyncBalance()).toBe(1100n);
  });

  it('handles zero-loss refund when leaving active table mid-hand', async () => {
    const bet = 50;
    await WalletService.reserveBet(bet, 'blackjack-table');
    expect(WalletService.getSyncBalance()).toBe(950n);

    // Dialog close / table disconnect refund
    await WalletService.refund(bet, 'blackjack-disconnect-refund');
    expect(WalletService.getSyncBalance()).toBe(1000n);
  });

  it('rejects bets when wallet has insufficient funds', async () => {
    const tooLargeBet = 5000;
    const reserved = await WalletService.reserveBet(tooLargeBet, 'blackjack-table');
    expect(reserved).toBe(false);
    expect(WalletService.getSyncBalance()).toBe(1000n);
  });
});


it('settles a scripted natural immediately and reveals the dealer',()=>{
 const game=scriptedGame(['AS','KC','8H','9D']),result=game.deal(50);
 expect(game.roundActive).toBe(false);expect(game.dealerRevealed).toBe(true);
 expect(result.roundImmediateEnd?.outcome).toBe('player_blackjack');
 expect(result.roundImmediateEnd?.payout).toBe(125);
});
